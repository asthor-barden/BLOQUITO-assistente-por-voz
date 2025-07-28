class UIManager {
    constructor() {
        this.sidebarVisible = false; // Começa fechada
        this.initializeUI();
    }

    initializeUI() {
        // Sidebar começa fechada
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.querySelector('.sidebar-toggle i');
        
        if (sidebar) {
            sidebar.classList.remove('visible');
        }
        
        if (toggleBtn) {
            toggleBtn.className = 'fas fa-bars';
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleIcon = document.querySelector('.sidebar-toggle i');
        
        this.sidebarVisible = !this.sidebarVisible;
        
        if (this.sidebarVisible) {
            sidebar.classList.add('visible');
            toggleIcon.className = 'fas fa-times';
        } else {
            sidebar.classList.remove('visible');
            toggleIcon.className = 'fas fa-bars';
        }
    }

    showWelcomeModal() {
        const modal = document.getElementById('welcomeModal');
        const nameInput = document.getElementById('nameInput');
        
        if (modal) {
            modal.style.display = 'flex';
        }
        
        if (nameInput) {
            nameInput.focus();
        }
    }
    
    hideWelcomeModal() {
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    updateUserDisplay(userName) {
        const userNameEl = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        
        if (userNameEl) {
            userNameEl.textContent = userName;
        }
        
        if (userAvatar) {
            userAvatar.textContent = userName.charAt(0).toUpperCase();
        }
    }

    renderMessage(content, type, userName, confidence = null) {
        const conversation = document.getElementById('conversation');
        if (!conversation) return;

        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        
        const avatar = document.createElement('div');
        avatar.className = `message-avatar ${type}-message-avatar`;
        avatar.textContent = type === 'user' ? userName.charAt(0).toUpperCase() : 'B';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = content.replace(/\n/g, '<br>');
        
        if (confidence !== null && type === 'user') {
            const confidencePercent = Math.round(confidence * 100);
            const confidenceBadge = document.createElement('span');
            confidenceBadge.className = 'confidence-indicator';
            if (confidencePercent < 70) confidenceBadge.classList.add('medium');
            if (confidencePercent < 50) confidenceBadge.classList.add('low');
            confidenceBadge.textContent = `${confidencePercent}%`;
            messageContent.appendChild(confidenceBadge);
        }
        
        messageEl.appendChild(avatar);
        messageEl.appendChild(messageContent);
        
        if (type === 'bot') {
            messageEl.classList.add('bot-message');
        }
        
        conversation.appendChild(messageEl);
        conversation.scrollTop = conversation.scrollHeight;
    }

    renderChatHistory(chats, currentChatId) {
        const chatHistory = document.getElementById('chatHistory');
        if (!chatHistory) return;

        chatHistory.innerHTML = '';
        
        const sortedChats = Object.values(chats).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        sortedChats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.chatId = chat.id;
            if (chat.id === currentChatId) {
                chatItem.classList.add('active');
            }
            
            chatItem.innerHTML = `
                <div class="chat-title">${chat.title}</div>
                <div class="chat-actions">
                    <button class="chat-action-btn" onclick="assistant.deleteChat('${chat.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            chatItem.addEventListener('click', (e) => {
                if (!e.target.closest('.chat-action-btn')) {
                    window.dispatchEvent(new CustomEvent('loadChat', {
                        detail: { chatId: chat.id }
                    }));
                }
            });
            
            chatHistory.appendChild(chatItem);
        });
    }

    renderConversation(messages, userName) {
        const conversation = document.getElementById('conversation');
        if (!conversation) return;

        conversation.innerHTML = '';
        
        messages.forEach(message => {
            this.renderMessage(message.content, message.type, userName, message.confidence);
        });
    }

    updateChatTitle(title) {
        const chatTitleHeader = document.getElementById('chatTitleHeader');
        if (chatTitleHeader) {
            chatTitleHeader.textContent = title;
        }
    }

    autoResizeTextInput() {
        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.style.height = 'auto';
            textInput.style.height = Math.min(textInput.scrollHeight, 120) + 'px';
        }
    }

    // Métodos para Voice Mode
    showVoiceMode() {
        const voiceMode = document.getElementById('voiceMode');
        if (voiceMode) {
            voiceMode.classList.add('active');
        }
    }

    hideVoiceMode() {
        const voiceMode = document.getElementById('voiceMode');
        const voiceAnimation = document.getElementById('voiceAnimation');
        
        if (voiceMode) {
            voiceMode.classList.remove('active');
        }
        
        if (voiceAnimation) {
            voiceAnimation.classList.remove('listening', 'speaking');
        }
    }

    updateVoiceStatus(status, subtitle) {
        const voiceStatus = document.getElementById('voiceStatus');
        const voiceSubtitle = document.getElementById('voiceSubtitle');
        
        if (voiceStatus) {
            voiceStatus.textContent = status;
        }
        
        if (voiceSubtitle) {
            voiceSubtitle.textContent = subtitle;
        }
    }

    setVoiceAnimation(type) {
        const voiceAnimation = document.getElementById('voiceAnimation');
        if (!voiceAnimation) return;

        voiceAnimation.classList.remove('listening', 'speaking');
        
        if (type) {
            voiceAnimation.classList.add(type);
        }
    }

    updateMuteButton(isMuted) {
        const muteBtn = document.getElementById('muteBtn');
        if (!muteBtn) return;

        if (isMuted) {
            muteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Ativar';
            muteBtn.classList.add('muted');
        } else {
            muteBtn.innerHTML = '<i class="fas fa-microphone"></i> Silenciar';
            muteBtn.classList.remove('muted');
        }
    }
}