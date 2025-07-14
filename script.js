// --- DOM Elements ---
const chatMessages = document.getElementById("chat-messages")
const chatInput = document.getElementById("chat-input")
const chatInputForm = document.getElementById("chat-input-form")
const sendButton = document.getElementById("send-button")
const messagesEndRef = document.getElementById("messages-end-ref")

// --- State Variables ---
let isLoading = false

// --- API Utility ---
// ¡IMPORTANTE! Cambia esta URL a la de tu backend desplegado en Render
const backendUrl = "https://langchain-agent-backend.onrender.com/chat" // <-- ¡Aquí está el cambio!

async function sendMessageToAgent(query) {
  try {
    const response = await fetch(backendUrl, {
      // <-- Usamos la nueva URL aquí
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

async function handleSendMessage(message) {
  const newUserMessage = createChatMessage(message, "user")
  chatMessages.appendChild(newUserMessage)
  scrollToBottom()

  isLoading = true
  chatInput.disabled = true
  sendButton.disabled = true
  chatInput.placeholder = "Pensando..."

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
    isLoading = false
    chatInput.disabled = false
    sendButton.disabled = false
    chatInput.placeholder = "Escribe tu mensaje..."
    chatInput.value = "" // Clear input
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

// Initial welcome message and Lucide icon initialization
document.addEventListener("DOMContentLoaded", () => {
  const welcomeMessage = createChatMessage(
    "¡Hola! Soy tu asistente conversacional. ¿En qué puedo ayudarte hoy?",
    "agent",
  )
  chatMessages.appendChild(welcomeMessage)
  scrollToBottom()
  // Initialize Lucide icons
  window.lucide.createIcons()
})

// Re-render Lucide icons after new messages are added (optional, but good practice if icons are dynamic)
const observer = new MutationObserver(() => {
  window.lucide.createIcons()
})
observer.observe(chatMessages, { childList: true, subtree: true })
