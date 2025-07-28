class BloquitoAssistant {
    constructor() {
        this.currentChatId = null;
        this.chats = this.loadChats();
        this.userName = this.loadUserName();
        this.isVoiceMode = false;
        this.isMuted = false;
        this.knowledgeBase = {};
        
        // Verifica se as classes estão disponíveis
        if (typeof UIManager === 'undefined') {
            console.error('❌ UIManager não encontrado. Verifique se ui-manager.js foi carregado.');
            return;
        }
        
        if (typeof VoiceManager === 'undefined') {
            console.error('❌ VoiceManager não encontrado. Verifique se voice-manager.js foi carregado.');
            return;
        }
        
        // Inicializa componentes
        this.uiManager = new UIManager();
        this.voiceManager = new VoiceManager();
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            await this.loadKnowledgeBase();
            this.setupEventListeners();
            
            if (this.userName === null) {
                this.uiManager.showWelcomeModal();
            } else {
                this.uiManager.hideWelcomeModal();
                this.uiManager.updateUserDisplay(this.userName);
                this.createNewChat();
            }
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
        }
    }

    async loadKnowledgeBase() {
        try {
            const response = await fetch('./data/knowledge.json');
            this.knowledgeBase = await response.json();
            console.log('✅ Base de conhecimento carregada');
        } catch (error) {
            console.error('❌ Erro ao carregar base de conhecimento:', error);
            // Fallback básico
            this.knowledgeBase = {
                "default": {
                    "response": "Desculpe, houve um erro ao carregar minha base de conhecimento. Algumas funcionalidades podem estar limitadas.",
                    "speech": "Desculpe, houve um erro ao carregar minha base de conhecimento. Algumas funcionalidades podem estar limitadas."
                }
            };
        }
    }

    setupEventListeners() {
        // Event listeners para input de texto
        const textInput = document.getElementById('textInput');
        const sendBtn = document.getElementById('sendBtn');
        const nameInput = document.getElementById('nameInput');

        if (textInput) {
            textInput.addEventListener('input', () => {
                this.uiManager.autoResizeTextInput();
                if (sendBtn) {
                    sendBtn.disabled = textInput.value.trim().length === 0;
                }
            });
            
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.setUserName();
                }
            });
        }

        // Event listeners para eventos de voz
        window.addEventListener('voiceInput', (e) => {
            if (this.isVoiceMode) {
                this.addMessage(e.detail.text, 'user', e.detail.confidence);
                this.processCommand(e.detail.text.toLowerCase());
            }
        });

        window.addEventListener('voiceInterim', (e) => {
            if (this.isVoiceMode) {
                this.uiManager.updateVoiceStatus('Ouvindo', `"${e.detail.text}"`);
            }
        });

        window.addEventListener('voiceError', (e) => {
            if (this.isVoiceMode && e.detail.error !== 'no-speech') {
                this.uiManager.updateVoiceStatus('Erro no reconhecimento', 'Tente falar novamente ou verifique o microfone');
                
                setTimeout(() => {
                    if (this.isVoiceMode && !this.isMuted) {
                        this.uiManager.updateVoiceStatus('Ouvindo', 'Fale naturalmente para conversar comigo');
                        this.voiceManager.startListening();
                    }
                }, 2000);
            }
        });

        window.addEventListener('voiceEnd', () => {
            if (this.isVoiceMode && !this.isMuted) {
                setTimeout(() => {
                    if (this.isVoiceMode && !this.isMuted) {
                        this.voiceManager.startListening();
                    }
                }, 1500);
            }
        });

        window.addEventListener('speechStart', () => {
            if (this.isVoiceMode) {
                this.uiManager.setVoiceAnimation('speaking');
                this.uiManager.updateVoiceStatus('Respondendo', 'Aguarde enquanto processo sua resposta');
                this.voiceManager.stopListening();
            }
        });

        window.addEventListener('speechEnd', () => {
            if (this.isVoiceMode && !this.isMuted) {
                this.uiManager.setVoiceAnimation('listening');
                this.uiManager.updateVoiceStatus('Ouvindo', 'Fale naturalmente para conversar comigo');
                setTimeout(() => {
                    if (this.isVoiceMode && !this.isMuted) {
                        this.voiceManager.startListening();
                    }
                }, 500);
            }
        });

        // Event listener para carregar chat
        window.addEventListener('loadChat', (e) => {
            this.loadChat(e.detail.chatId);
        });
    }

    // Sistema inteligente de busca de respostas
    findSmartResponse(command) {
        if (!this.knowledgeBase) {
            return {
                response: "Base de conhecimento ainda não foi carregada. Aguarde um momento.",
                speech: "Base de conhecimento ainda não foi carregada. Aguarde um momento."
            };
        }
        
        const normalizedCommand = this.normalizeText(command);
        let bestMatch = { data: null, score: 0 };
        
        // Busca inteligente por palavras-chave
        for (const [key, data] of Object.entries(this.knowledgeBase)) {
            if (key === 'default') continue;
            
            const keywords = data.keywords || [];
            let matchScore = 0;
            
            for (const keyword of keywords) {
                const normalizedKeyword = this.normalizeText(keyword);
                
                // Verifica correspondência exata
                if (normalizedCommand.includes(normalizedKeyword)) {
                    matchScore += 2;
                }
                
                // Verifica correspondência parcial
                const commandWords = normalizedCommand.split(' ');
                const keywordWords = normalizedKeyword.split(' ');
                
                for (const cmdWord of commandWords) {
                    for (const keyWord of keywordWords) {
                        if (cmdWord.includes(keyWord) || keyWord.includes(cmdWord)) {
                            matchScore += 0.5;
                        }
                    }
                }
            }
            
            if (matchScore > bestMatch.score) {
                bestMatch = { data, score: matchScore };
            }
        }
        
        // Retorna melhor correspondência ou resposta padrão
        return bestMatch.score > 0 ? bestMatch.data : this.knowledgeBase.default;
    }

    normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Gerenciamento de usuário
    setUserName() {
        const nameInput = document.getElementById('nameInput');
        const name = nameInput ? nameInput.value.trim() : '';
        this.userName = name || 'Usuário';
        this.saveUserName(this.userName);
        this.uiManager.updateUserDisplay(this.userName);
        this.uiManager.hideWelcomeModal();
        this.createNewChat();
    }
    
    skipNameSetup() {
        this.userName = 'Usuário';
        this.saveUserName(this.userName);
        this.uiManager.updateUserDisplay(this.userName);
        this.uiManager.hideWelcomeModal();
        this.createNewChat();
    }
    
    editUserName() {
        const newName = prompt('Como gostaria de ser chamado?', this.userName);
        if (newName !== null) {
            this.userName = newName.trim() || 'Usuário';
            this.saveUserName(this.userName);
            this.uiManager.updateUserDisplay(this.userName);
        }
    }

    loadUserName() {
        const saved = localStorage.getItem('bloquito_user_name');
        return saved === null ? null : saved;
    }
    
    saveUserName(name) {
        localStorage.setItem('bloquito_user_name', name);
    }

    // Gerenciamento de chats
    loadChats() {
        const saved = localStorage.getItem('bloquito_chats');
        return saved ? JSON.parse(saved) : {};
    }
    
    saveChats() {
        localStorage.setItem('bloquito_chats', JSON.stringify(this.chats));
    }

    createNewChat() {
        const chatId = 'chat_' + Date.now();
        const chatTitle = 'Nova conversa';
        
        this.chats[chatId] = {
            id: chatId,
            title: chatTitle,
            messages: [],
            createdAt: new Date().toISOString()
        };
        
        this.currentChatId = chatId;
        this.saveChats();
        this.uiManager.renderChatHistory(this.chats, this.currentChatId);
        this.uiManager.renderConversation([], this.userName);
        this.uiManager.updateChatTitle(chatTitle);
        
        // Adiciona mensagem de boas-vindas
        const welcomeMessage = this.userName === 'Usuário' 
            ? 'Olá! Eu sou o Bloquito, seu assistente inteligente especializado em produtos da Asthor Barden. Como posso ajudá-lo hoje?'
            : `Olá, ${this.userName}! Eu sou o Bloquito, seu assistente inteligente especializado em produtos da Asthor Barden. Como posso ajudá-lo hoje?`;
        
        this.addMessage(welcomeMessage, 'bot');
    }

    loadChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats[chatId];
        
        if (chat) {
            this.uiManager.renderConversation(chat.messages, this.userName);
            this.uiManager.updateChatTitle(chat.title);
            this.uiManager.renderChatHistory(this.chats, this.currentChatId);
        }
    }

    deleteChat(chatId) {
        if (confirm('Tem certeza que deseja excluir esta conversa?')) {
            delete this.chats[chatId];
            this.saveChats();
            this.uiManager.renderChatHistory(this.chats, this.currentChatId);
            
            if (this.currentChatId === chatId) {
                this.createNewChat();
            }
        }
    }

    addMessage(content, type, confidence = null) {
        if (!this.currentChatId) return;
        
        const message = {
            content,
            type,
            confidence,
            timestamp: new Date().toISOString()
        };
        
        this.chats[this.currentChatId].messages.push(message);
        
        // Atualiza título do chat se for a primeira mensagem do usuário
        if (type === 'user' && this.chats[this.currentChatId].messages.length === 2) {
            const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
            this.chats[this.currentChatId].title = title;
            this.uiManager.updateChatTitle(title);
            this.uiManager.renderChatHistory(this.chats, this.currentChatId);
        }
        
        this.saveChats();
        this.uiManager.renderMessage(content, type, this.userName, confidence);
    }

    // Envio de mensagens
    sendMessage() {
        const textInput = document.getElementById('textInput');
        const sendBtn = document.getElementById('sendBtn');
        
        if (!textInput) return;
        
        const message = textInput.value.trim();
        if (!message) return;
        
        this.addMessage(message, 'user');
        this.processCommand(message.toLowerCase());
        
        textInput.value = '';
        this.uiManager.autoResizeTextInput();
        
        if (sendBtn) {
            sendBtn.disabled = true;
        }
        
        textInput.focus();
    }

    processCommand(command) {
        setTimeout(() => {
            const now = new Date();
            const timeString = now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0');
            
            // Busca inteligente na base de conhecimento
            const responseData = this.findSmartResponse(command);
            let response = responseData.response;
            let speechResponse = responseData.speech || responseData.response;
            
            // Substitui placeholders
            const userName = this.userName === 'Usuário' ? '' : `, ${this.userName}`;
            response = response.replace(/{userName}/g, userName);
            response = response.replace(/{time}/g, timeString);
            
            speechResponse = speechResponse.replace(/{userName}/g, userName);
            speechResponse = speechResponse.replace(/{time}/g, timeString);
            
            // Ações especiais
            if (responseData.action === 'stop_voice') {
                const stopAction = this.isVoiceMode 
                    ? 'Finalizando a conversa por voz. Você pode continuar conversando comigo por texto.'
                    : 'Você pode continuar conversando comigo por texto.';
                response = response.replace(/{stopAction}/g, stopAction);
                speechResponse = speechResponse.replace(/{stopAction}/g, stopAction);
                
                if (this.isVoiceMode) {
                    setTimeout(() => this.closeVoiceMode(), 3000);
                }
            }
            
            // Adiciona mensagem e fala
            this.addMessage(response, 'bot');
            
            if (this.isVoiceMode) {
                this.voiceManager.speak(response, speechResponse);
            }
            
        }, 800);
    }

    // Controles de voz
    toggleVoiceMode() {
        this.isVoiceMode = true;
        this.uiManager.showVoiceMode();
        this.startVoiceMode();
    }

    startVoiceMode() {
        this.uiManager.updateVoiceStatus('Iniciando...', 'Preparando o sistema de reconhecimento de voz');
        
        setTimeout(() => {
            this.uiManager.updateVoiceStatus('Ouvindo', 'Fale naturalmente para conversar comigo');
            this.uiManager.setVoiceAnimation('listening');
            this.voiceManager.startListening();
        }, 1500);
    }

    closeVoiceMode() {
        this.isVoiceMode = false;
        this.isMuted = false;
        this.voiceManager.stopListening();
        this.voiceManager.cancelSpeech();
        this.uiManager.hideVoiceMode();
        this.uiManager.updateMuteButton(false);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.uiManager.updateMuteButton(this.isMuted);
        
        if (this.isMuted) {
            this.uiManager.updateVoiceStatus('Microfone desativado', 'Clique em "Ativar" para continuar ouvindo');
            this.voiceManager.stopListening();
            this.uiManager.setVoiceAnimation(null);
        } else {
            this.uiManager.updateVoiceStatus('Ouvindo', 'Fale naturalmente para conversar comigo');
            this.uiManager.setVoiceAnimation('listening');
            this.voiceManager.startListening();
        }
    }

    // Controle da sidebar
    toggleSidebar() {
        this.uiManager.toggleSidebar();
    }
}

// Funções globais para compatibilidade - com verificação de segurança
let assistant;

function setUserName() {
    if (assistant) assistant.setUserName();
}

function skipNameSetup() {
    if (assistant) assistant.skipNameSetup();
}

function editUserName() {
    if (assistant) assistant.editUserName();
}

function createNewChat() {
    if (assistant) assistant.createNewChat();
}

function toggleVoiceMode() {
    if (assistant) assistant.toggleVoiceMode();
}

function closeVoiceMode() {
    if (assistant) assistant.closeVoiceMode();
}

function toggleMute() {
    if (assistant) assistant.toggleMute();
}

function sendMessage() {
    if (assistant) assistant.sendMessage();
}

function toggleSidebar() {
    if (assistant) assistant.toggleSidebar();
}

// Inicializa quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    assistant = new BloquitoAssistant();
});