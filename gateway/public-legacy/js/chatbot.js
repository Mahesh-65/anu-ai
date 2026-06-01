// Floating Chatbot Widget logic and Markdown Parser for Anu AI

const chatLauncher = document.getElementById('chat-launcher');
const chatWindow = document.getElementById('chat-window');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const btnClearChat = document.getElementById('btn-clear-chat');
const btnMinimizeChat = document.getElementById('btn-minimize-chat');
const chatTyping = document.getElementById('chat-typing');
const chatBadge = document.getElementById('chat-badge');
const suggestionPills = document.querySelectorAll('.suggestion-pill');
const chatSubtitle = document.getElementById('chat-subtitle');

let isChatOpen = false;
let messageCount = 0;

// Initialize Chatbot
document.addEventListener('DOMContentLoaded', () => {
    setupChatEventListeners();
    checkChatEngineStatus();
    
    // Check status whenever library updates
    window.addEventListener('knowledge-base-updated', checkChatEngineStatus);
});

// Sync connection status with header
async function checkChatEngineStatus() {
    try {
        const res = await fetch('/api/health');
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        if (data.api_key_configured) {
            if (data.llm_provider === 'groq') {
                chatSubtitle.textContent = 'RAG Groq Model Active';
            } else {
                chatSubtitle.textContent = 'RAG Gemini Model Active';
            }
            chatSubtitle.style.color = 'var(--secondary)';
        } else {
            chatSubtitle.textContent = 'Offline Fallback Engine Active';
            chatSubtitle.style.color = 'var(--warning)';
        }
    } catch {
        chatSubtitle.textContent = 'AI Server Disconnected';
        chatSubtitle.style.color = 'var(--danger)';
    }
}

// Attach listeners
function setupChatEventListeners() {
    chatLauncher.addEventListener('click', toggleChatWindow);
    btnMinimizeChat.addEventListener('click', () => toggleChatWindow(false));
    
    // Clear conversation history
    btnClearChat.addEventListener('click', () => {
        if (confirm('Clear active conversation history?')) {
            chatMessages.innerHTML = `
                <div class="msg-bubble assistant-msg animate-bubble">
                    <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
                    <div class="msg-content">
                        <p>Conversation history cleared. Ready for your questions!</p>
                    </div>
                </div>
            `;
            messageCount = 0;
            updateUnreadBadge();
        }
    });

    // Auto-expand input box as user types
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight - 4) + 'px';
        chatSend.disabled = chatInput.value.trim() === '';
    });

    // Submit on Enter, line break on Shift+Enter
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitUserMessage();
        }
    });

    chatSend.addEventListener('click', submitUserMessage);

    // Dynamic Suggestion Pills click handler
    suggestionPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const queryText = pill.getAttribute('data-query');
            chatInput.value = queryText;
            chatSend.disabled = false;
            submitUserMessage();
        });
    });
}

function toggleChatWindow(forceState) {
    isChatOpen = typeof forceState === 'boolean' ? forceState : !isChatOpen;
    
    if (isChatOpen) {
        chatWindow.classList.add('active');
        chatLauncher.querySelector('.open-icon').style.display = 'none';
        chatLauncher.querySelector('.close-icon').style.display = 'block';
        chatBadge.style.display = 'none';
        
        // Focus input after anim finish
        setTimeout(() => chatInput.focus(), 300);
    } else {
        chatWindow.classList.remove('active');
        chatLauncher.querySelector('.open-icon').style.display = 'block';
        chatLauncher.querySelector('.close-icon').style.display = 'none';
    }
}

function updateUnreadBadge() {
    if (!isChatOpen && messageCount > 0) {
        chatBadge.textContent = messageCount;
        chatBadge.style.display = 'flex';
    } else {
        chatBadge.style.display = 'none';
    }
}

// Send user question to the backend
async function submitUserMessage() {
    const question = chatInput.value.trim();
    if (!question) return;

    // Reset input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatSend.disabled = true;

    // Add user bubble in UI
    appendMessageBubble('user', question);
    scrollToBottom();
    
    // Display typing dots
    chatTyping.style.display = 'flex';
    scrollToBottom();

    try {
        const res = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: question })
        });

        chatTyping.style.display = 'none';

        if (!res.ok) {
            throw new Error('AI Service failed to answer.');
        }

        const data = await res.json();
        
        // Process references and print answers in markdown format
        let rawAnswer = data.answer;
        
        // Embed the formatted response
        appendMessageBubble('assistant', rawAnswer);
        
        if (!isChatOpen) {
            messageCount++;
            updateUnreadBadge();
        }

    } catch (err) {
        chatTyping.style.display = 'none';
        appendMessageBubble('assistant', '⚠️ **System Error**: I failed to retrieve a response. Please check that the backend FastAPI Python server is running and reachable.');
    }
    
    scrollToBottom();
}

// Append bubble to DOM
function appendMessageBubble(sender, text) {
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${sender}-msg animate-bubble`;
    
    const icon = sender === 'assistant' ? 'fa-robot' : 'fa-user';
    const parsedHtml = sender === 'assistant' ? parseMarkdownToHtml(text) : escapeHtml(text);
    
    bubble.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid ${icon}"></i></div>
        <div class="msg-content">${parsedHtml}</div>
    `;
    
    chatMessages.appendChild(bubble);
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Simple security sanitizer
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// High fidelity markdown to html converter built natively!
function parseMarkdownToHtml(md) {
    if (!md) return '';
    
    let html = md;

    // Replace system blockquote alerts first (e.g. > [!NOTE])
    html = html.replace(/^>\s*\[!NOTE\]\s*\n([\s\S]*?)(?=(?:\n>[^\n]*)*\n\n|$)/gm, (match, content) => {
        const cleaned = content.replace(/^>\s?/gm, '');
        return `<div class="alert-box note-alert" style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid var(--info); padding: 10px 14px; border-radius: 8px; margin: 10px 0;"><span style="font-weight: 700; color: var(--info); font-size: 0.8rem; text-transform: uppercase;"><i class="fa-solid fa-circle-info"></i> Note</span><p style="font-size: 0.84rem; margin-top: 4px;">${parseMarkdownToHtml(cleaned)}</p></div>`;
    });

    html = html.replace(/^>\s*\[!TIP\]\s*\n([\s\S]*?)(?=(?:\n>[^\n]*)*\n\n|$)/gm, (match, content) => {
        const cleaned = content.replace(/^>\s?/gm, '');
        return `<div class="alert-box tip-alert" style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--success); padding: 10px 14px; border-radius: 8px; margin: 10px 0;"><span style="font-weight: 700; color: var(--success); font-size: 0.8rem; text-transform: uppercase;"><i class="fa-solid fa-lightbulb"></i> Tip</span><p style="font-size: 0.84rem; margin-top: 4px;">${parseMarkdownToHtml(cleaned)}</p></div>`;
    });

    // Code blocks ```javascript ... ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre style="background: rgba(0,0,0,0.4); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); font-family: var(--font-mono); font-size: 0.78rem; overflow-x: auto; margin: 10px 0;"><code style="color: #a78bfa;">${escapeHtml(code.trim())}</code></pre>`;
    });

    // Inline code blocks `code`
    html = html.replace(/`([^`\n]+)`/g, '<code style="font-family: var(--font-mono); color: #f472b6; background: rgba(0,0,0,0.25); padding: 2px 5px; border-radius: 4px; font-size: 0.82rem;">$1</code>');

    // Bold text **bold**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight: 700;">$1</strong>');

    // Italic text *italic*
    html = html.replace(/\*([^*]+)\*/g, '<em style="font-style: italic;">$1</em>');

    // Heading tags
    html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-top: 14px; margin-bottom: 6px;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-top: 16px; margin-bottom: 8px;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 1.3rem; font-weight: 800; color: var(--text-primary); margin-top: 18px; margin-bottom: 10px;">$1</h1>');

    // Unordered lists - list items
    html = html.replace(/^\s*-\s+(.*)/gm, '<li style="margin-left: 12px; margin-bottom: 4px;">$1</li>');
    // Group adjacent lists
    html = html.replace(/(<li>.*<\/li>)+/g, '<ul style="padding-left: 8px; margin: 8px 0;">$&</ul>');

    // Standard blockquote lines > quote
    html = html.replace(/^\>\s+(.*)/gm, '<blockquote style="border-left: 3px solid var(--secondary); padding-left: 12px; color: var(--text-secondary); margin: 10px 0; font-style: italic;">$1</blockquote>');

    // Citation highlighting: [filename.pdf] or [file.txt]
    // Replaces brackets that represent filenames inside answers to formatted UI badges
    html = html.replace(/\[([a-zA-Z0-9_\-\.\s]+\.(?:pdf|txt|md))\]/g, '<span class="citation"><i class="fa-solid fa-file" style="font-size:0.7rem; margin-right:4px;"></i>$1</span>');

    // Split paragraphs by double-newline
    const lines = html.split('\n\n');
    const finalHtml = lines.map(line => {
        const trimmed = line.trim();
        // Skip tags that are already blocks
        if (
            trimmed.startsWith('<h') ||
            trimmed.startsWith('<pre') ||
            trimmed.startsWith('<ul') ||
            trimmed.startsWith('<blockquote') ||
            trimmed.startsWith('<div')
        ) {
            return trimmed;
        }
        return trimmed ? `<p style="margin-bottom: 10px;">${trimmed}</p>` : '';
    }).join('\n');

    return finalHtml;
}
