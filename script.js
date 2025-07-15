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

// --- State Variables ---
let isLoading = false
let selectedCedulaFile = null // To store the selected file

// --- API Utility ---
// ¡IMPORTANTE! Ahora las URLs son absolutas, apuntando al puerto del backend
const backendBaseUrl = "https://langchain-agent-backend.onrender.com" // La URL base de tu backend
const backendChatUrl = `${backendBaseUrl}/api/chat` // Para mensajes de chat
const backendUploadUrl = `${backendBaseUrl}/api/upload-cedula` // Para subir cédulas

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
    return data.response
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
    return data.extracted_data // El backend devolverá los datos extraídos
  } catch (error) {
    console.error("Error en uploadCedulaToBackend:", error)
    throw error
  }
}

// --- ChatMessage Component ---
function createChatMessage(message, sender) {
  const isUser = sender === "user"
  const messageDiv = document.createElement("div")
  messageDiv.className = `flex items-start gap-3 mb-4 animate-fade-in ${isUser ? "justify-end" : "justify-start"}`

  if (!isUser) {
    const agentAvatar = `
            <div class="h-9 w-9 border-2 border-gray-600 shadow-sm rounded-full flex items-center justify-center bg-blue-500 text-white text-lg font-semibold">🤖</div>
        `
    messageDiv.innerHTML += agentAvatar
  }

  const messageBubble = `
        <div class="max-w-[70%] p-4 text-base shadow-lg transition-all duration-300 ease-in-out ${
          isUser
            ? "bg-red-600 text-white rounded-t-xl rounded-bl-xl"
            : "bg-gray-700 text-gray-100 rounded-t-xl rounded-br-xl border border-gray-600"
        }">
            ${message}
        </div>
    `
  messageDiv.innerHTML += messageBubble

  if (isUser) {
    const userAvatar = `
            <div class="h-9 w-9 border-2 border-gray-600 shadow-sm rounded-full flex items-center justify-center bg-gray-600 text-white text-lg font-semibold">👤</div>
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
  chatInput.placeholder = loading ? "Pensando..." : "Escribe tu mensaje..."
}

async function handleSendMessage(message) {
  const newUserMessage = createChatMessage(message, "user")
  chatMessages.appendChild(newUserMessage)
  scrollToBottom()

  setLoadingState(true)

  // Add a "thinking" message from the agent
  const thinkingMessage = createChatMessage("Pensando...", "agent")
  chatMessages.appendChild(thinkingMessage)
  scrollToBottom()

  try {
    const agentResponse = await sendMessageToAgent(message)
    // Remove the "thinking" message
    chatMessages.removeChild(thinkingMessage)
    const newAgentMessage = createChatMessage(agentResponse, "agent")
    chatMessages.appendChild(newAgentMessage)
  } catch (error) {
    console.error("Error al enviar mensaje:", error)
    // Remove the "thinking" message if it's still there
    if (chatMessages.contains(thinkingMessage)) {
      chatMessages.removeChild(thinkingMessage)
    }
    const errorMessage = createChatMessage(
      "Disculpa, hubo un error al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde.",
      "agent",
    )
    chatMessages.appendChild(errorMessage)
  } finally {
    setLoadingState(false)
    chatInput.value = "" // Clear input
    scrollToBottom()
  }
}

async function handleReadCedula() {
  if (!selectedCedulaFile) {
    alert("Por favor, selecciona un archivo de cédula primero.")
    return
  }

  setLoadingState(true)

  const userUploadMessage = createChatMessage("Subiendo y leyendo cédula...", "user")
  chatMessages.appendChild(userUploadMessage)
  scrollToBottom()

  const thinkingMessage = createChatMessage("Procesando documento...", "agent")
  chatMessages.appendChild(thinkingMessage)
  scrollToBottom()

  try {
    const extractedData = await uploadCedulaToBackend(selectedCedulaFile)
    chatMessages.removeChild(thinkingMessage)
    const agentResponse = `He leído la cédula y extraído la siguiente información:\n\n${extractedData}`
    const newAgentMessage = createChatMessage(agentResponse, "agent")
    chatMessages.appendChild(newAgentMessage)

    // Clear the file input and preview after successful upload
    cedulaUpload.value = ""
    selectedCedulaFile = null
    cedulaPreview.classList.add("hidden")
    cedulaPreviewImg.src = "#"
  } catch (error) {
    console.error("Error al leer cédula:", error)
    if (chatMessages.contains(thinkingMessage)) {
      chatMessages.removeChild(thinkingMessage)
    }
    const errorMessage = createChatMessage(
      "Disculpa, hubo un error al leer la cédula. Asegúrate de que sea una imagen clara y válida.",
      "agent",
    )
    chatMessages.appendChild(errorMessage)
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

    // Show image preview
    const reader = new FileReader()
    reader.onload = (e) => {
      cedulaPreviewImg.src = e.target.result
      cedulaPreview.classList.remove("hidden")
    }
    reader.readAsDataURL(file)
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
    "¡Hola! Soy tu asistente conversacional. ¿En qué puedo ayudarte hoy? También puedo leer datos de una cédula.",
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
