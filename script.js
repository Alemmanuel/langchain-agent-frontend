// --- DOM Elements ---
const chatMessages = document.getElementById("chat-messages")
const chatInput = document.getElementById("chat-input")
const chatInputForm = document.getElementById("chat-input-form")
const sendButton = document.getElementById("send-button")
const messagesEndRef = document.getElementById("messages-end-ref")

const cedulaUpload = document.getElementById("cedula-upload")
const readCedulaButton = document.getElementById("read-cedula-button")
const cedulaPreview = document.getElementById("cedula-preview")
const cedulaPreviewImg = cedulaPreview.querySelector("img")

// Token counter elements
const promptTokensSpan = document.getElementById("prompt-tokens")
const completionTokensSpan = document.getElementById("completion-tokens")
const totalTokensSpan = document.getElementById("total-tokens")

// --- State Variables ---
let isLoading = false
let selectedCedulaFile = null // To store the selected file

// --- API Utility ---
// URLs absolutas para cuando el frontend y el backend se ejecutan en puertos diferentes
const backendChatUrl = "http://localhost:8000/api/chat"
const backendUploadUrl = "http://localhost:8000/api/upload-cedula"

// Function to update token display
function updateTokenDisplay(tokenUsage) {
  promptTokensSpan.textContent = tokenUsage.prompt_tokens || 0
  completionTokensSpan.textContent = tokenUsage.completion_tokens || 0
  totalTokensSpan.textContent = tokenUsage.total_tokens || 0
}

async function sendMessageToAgent(query) {
  try {
    const response = await fetch(backendChatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "Error al conectar con el agente.")
    }

    const data = await response.json()
    return data // Return full data including token_usage
  } catch (error) {
    console.error("Error en sendMessageToAgent:", error)
    throw error
  }
}

async function uploadCedulaToBackend(file) {
  try {
    const formData = new FormData()
    formData.append("file", file) // 'file' es el nombre del campo esperado por FastAPI

    const response = await fetch(backendUploadUrl, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || "Error al procesar la cédula.")
    }

    const data = await response.json()
    return data // Return full data including token_usage
  } catch (error) {
    console.error("Error en uploadCedulaToBackend:", error)
    throw error
  }
}

// --- ChatMessage Component ---
function createChatMessage(message, sender) {
  const isUser = sender === "user"
  const messageDiv = document.createElement("div")
  // Apply the new glitch animation
  messageDiv.className = `flex items-start gap-3 mb-4 animate-fade-in-glitch ${isUser ? "justify-end" : "justify-start"}`

  if (!isUser) {
    const agentAvatar = `
          <div class="h-10 w-10 border-2 border-cyan-500 shadow-md rounded-full flex items-center justify-center bg-cyan-700 text-white text-xl font-bold transform rotate-6">🤖</div>
      `
    messageDiv.innerHTML += agentAvatar
  }

  const messageBubble = `
      <div class="max-w-[70%] p-4 text-base shadow-lg transition-all duration-300 ease-in-out ${
        isUser
          ? "user-bubble text-white" // Custom class for user bubble
          : "agent-bubble text-gray-900" // Custom class for agent bubble
      }">
          ${message}
      </div>
  `
  messageDiv.innerHTML += messageBubble

  if (isUser) {
    const userAvatar = `
          <div class="h-10 w-10 border-2 border-fuchsia-500 shadow-md rounded-full flex items-center justify-center bg-fuchsia-700 text-white text-xl font-bold transform -rotate-6">👤</div>
      `
    messageDiv.innerHTML += userAvatar
  }

  return messageDiv
}

// --- Chat Logic ---
function scrollToBottom() {
  messagesEndRef.scrollIntoView({ behavior: "smooth" })
}

function setLoadingState(loading) {
  isLoading = loading
  chatInput.disabled = loading
  sendButton.disabled = loading
  cedulaUpload.disabled = loading
  readCedulaButton.disabled = loading || !selectedCedulaFile // Disable read button if no file
  chatInput.placeholder = loading ? "Procesando datos..." : "Ingresa tu consulta aquí..."

  // Add/remove loading spinner on send button
  const sendIcon = sendButton.querySelector(".lucide-send-horizonal")
  const spinner = sendButton.querySelector(".loading-spinner")
  if (loading) {
    if (sendIcon) sendIcon.classList.add("hidden")
    if (!spinner) {
      const newSpinner = document.createElement("span")
      newSpinner.className = "loading-spinner glitch-spinner animate-spin h-6 w-6 border-4 rounded-full" // Apply glitch-spinner
      sendButton.prepend(newSpinner)
    }
  } else {
    if (sendIcon) sendIcon.classList.remove("hidden")
    if (spinner) spinner.remove()
  }
}

async function handleSendMessage(message) {
  const newUserMessage = createChatMessage(message, "user")
  chatMessages.appendChild(newUserMessage)
  scrollToBottom()

  setLoadingState(true)

  // Add a "thinking" message from the agent
  const thinkingMessage = createChatMessage("Analizando...", "agent")
  chatMessages.appendChild(thinkingMessage)
  scrollToBottom()

  try {
    const responseData = await sendMessageToAgent(message) // Get full response data

    // Remove the "thinking" message
    chatMessages.removeChild(thinkingMessage)

    const agentResponse = responseData.response
    const tokenUsage = responseData.token_usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

    const newAgentMessage = createChatMessage(agentResponse, "agent")
    chatMessages.appendChild(newAgentMessage)
    updateTokenDisplay(tokenUsage) // Update token display
  } catch (error) {
    console.error("Error al enviar mensaje:", error)
    // Remove the "thinking" message if it's still there
    if (chatMessages.contains(thinkingMessage)) {
      chatMessages.removeChild(thinkingMessage)
    }
    const errorMessage = createChatMessage(
      "Error de conexión. El sistema está experimentando fallos. Intenta de nuevo.",
      "agent",
    )
    chatMessages.appendChild(errorMessage)
    updateTokenDisplay({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }) // Reset tokens on error
  } finally {
    setLoadingState(false)
    chatInput.value = "" // Clear input
    scrollToBottom()
  }
}

async function handleReadCedula() {
  if (!selectedCedulaFile) {
    alert("Error: No se ha detectado ningún archivo. Por favor, selecciona un documento.")
    return
  }

  setLoadingState(true)

  const userUploadMessage = createChatMessage("Iniciando protocolo de carga...", "user")
  chatMessages.appendChild(userUploadMessage)
  scrollToBottom()

  const thinkingMessage = createChatMessage("Decodificando datos...", "agent")
  chatMessages.appendChild(thinkingMessage)
  scrollToBottom()

  try {
    const responseData = await uploadCedulaToBackend(selectedCedulaFile) // Get full response data

    chatMessages.removeChild(thinkingMessage)

    let agentResponseText
    // Check if the response contains a 'response' field (indicating a validation error message)
    if (responseData.response) {
      agentResponseText = responseData.response
    } else {
      // Otherwise, it's successful extracted data
      agentResponseText = `[DATOS EXTRAÍDOS]:\n\n${responseData.extracted_data}`
    }

    const tokenUsage = responseData.token_usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

    const newAgentMessage = createChatMessage(agentResponseText, "agent")
    chatMessages.appendChild(newAgentMessage)
    updateTokenDisplay(tokenUsage) // Update token display

    // Clear the file input and preview after processing (regardless of validation success)
    cedulaUpload.value = ""
    selectedCedulaFile = null
    cedulaPreview.classList.add("hidden") // Ensure preview is hidden
    cedulaPreviewImg.src = "#"
  } catch (error) {
    console.error("Error al leer cédula:", error)
    if (chatMessages.contains(thinkingMessage)) {
      chatMessages.removeChild(thinkingMessage)
    }
    const errorMessage = createChatMessage(
      "Fallo en la lectura del documento. Verifique la integridad del archivo e intente de nuevo.",
      "agent",
    )
    chatMessages.appendChild(errorMessage)
    updateTokenDisplay({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }) // Reset tokens on error
  } finally {
    setLoadingState(false)
    scrollToBottom()
  }
}

// --- Event Listeners ---
chatInputForm.addEventListener("submit", (e) => {
  e.preventDefault()
  const message = chatInput.value.trim()
  if (message && !isLoading) {
    handleSendMessage(message)
  }
})

cedulaUpload.addEventListener("change", (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedCedulaFile = file
    readCedulaButton.disabled = false // Enable button when file is selected

    // No longer showing image preview
    cedulaPreview.classList.add("hidden") // Ensure it's hidden
    cedulaPreviewImg.src = "#" // Clear any previous image
  } else {
    selectedCedulaFile = null
    readCedulaButton.disabled = true // Disable button if no file
    cedulaPreview.classList.add("hidden")
    cedulaPreviewImg.src = "#"
  }
})

readCedulaButton.addEventListener("click", handleReadCedula)

// Initial welcome message and Lucide icon initialization
document.addEventListener("DOMContentLoaded", () => {
  const welcomeMessage = createChatMessage(
    "// INICIANDO SISTEMA // Asistente Glitch en línea. ¿Qué anomalía deseas investigar hoy? También puedo procesar documentos.",
    "agent",
  )
  chatMessages.appendChild(welcomeMessage)
  scrollToBottom()
  // Initialize Lucide icons
  window.lucide.createIcons()
  // Initially disable the read cedula button
  readCedulaButton.disabled = true
})

// Re-render Lucide icons after new messages are added (optional, but good practice if icons are dynamic)
const observer = new MutationObserver(() => {
  window.lucide.createIcons()
})
observer.observe(chatMessages, { childList: true, subtree: true })
