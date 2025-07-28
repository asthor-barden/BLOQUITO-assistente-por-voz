class VoiceManager {
    constructor() {
        this.recognition = null;
        this.selectedVoice = null;
        this.voiceSpeedValue = 0.9;
        this.availableVoices = [];
        this.isListening = false;
        this.voiceReplacements = {};
        
        this.loadVoiceReplacements();
        this.setupVoiceRecognition();
        this.loadVoices();
    }

    async loadVoiceReplacements() {
        try {
            const response = await fetch('./data/voice-replacements.json');
            this.voiceReplacements = await response.json();
            console.log('✅ Substituições de voz carregadas');
        } catch (error) {
            console.error('❌ Erro ao carregar substituições:', error);
            // Fallback com substituições básicas
            this.voiceReplacements = {
                "words": {
                    "STEAMAKER": "Istim Maiquer",
                    "Bloco+": "Bloco mais",
                    "ESP32": "E S P trinta e dois",
                    "CorelLASER": "Corel Laser",
                    "Asthor Barden": "Asthor Bardem",
                    "LED": "L E D",
                    "LEDs": "L E Ds",
                    "DC": "D C"
                },
                "phrases": {
                    "Bloco+ Bot": "Bloco mais Bot",
                    "kit STEAM": "kit Istim",
                    "projetos STEAM": "projetos Istim"
                },
                "symbols": {
                    "+": " mais ",
                    "&": " e ",
                    "@": " arroba "
                }
            };
        }
    }

    setupVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('Reconhecimento de voz não disponível');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'pt-BR';
        this.recognition.maxAlternatives = 1;
        
        this.recognition.onstart = () => {
            this.isListening = true;
        };
        
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            let confidence = 0;
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;
                confidence = result[0].confidence || 0;
                
                if (result.isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Dispara evento customizado para o app principal
            if (finalTranscript) {
                const cleanTranscript = finalTranscript.trim();
                if (cleanTranscript.length > 2 && confidence > 0.3) {
                    window.dispatchEvent(new CustomEvent('voiceInput', {
                        detail: { text: cleanTranscript, confidence }
                    }));
                }
            }
            
            if (interimTranscript) {
                window.dispatchEvent(new CustomEvent('voiceInterim', {
                    detail: { text: interimTranscript }
                }));
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Erro no reconhecimento:', event.error);
            window.dispatchEvent(new CustomEvent('voiceError', {
                detail: { error: event.error }
            }));
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            window.dispatchEvent(new CustomEvent('voiceEnd'));
        };
    }

    startListening() {
        if (!this.recognition || this.isListening) return;
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Erro ao iniciar reconhecimento:', error);
        }
    }
    
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    loadVoices() {
        const updateVoices = () => {
            this.availableVoices = speechSynthesis.getVoices().filter(voice => 
                voice.lang.startsWith('pt') || voice.lang.startsWith('en')
            );
            
            const voiceSelect = document.getElementById('voiceSelect');
            if (voiceSelect) {
                voiceSelect.innerHTML = '<option value="">Voz padrão do sistema</option>';
                
                this.availableVoices.forEach((voice, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `${voice.name} (${voice.lang})`;
                    voiceSelect.appendChild(option);
                });
                
                // Seleciona uma voz em português por padrão
                const ptVoice = this.availableVoices.find(voice => voice.lang.startsWith('pt'));
                if (ptVoice) {
                    const ptIndex = this.availableVoices.indexOf(ptVoice);
                    voiceSelect.value = ptIndex;
                    this.selectedVoice = ptVoice;
                }
            }
        };
        
        updateVoices();
        speechSynthesis.onvoiceschanged = updateVoices;
        
        // Event listener para mudança de voz (será configurado pelo app principal)
        this.setupVoiceControls();
    }

    setupVoiceControls() {
        // Aguarda o DOM estar carregado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindVoiceControls());
        } else {
            this.bindVoiceControls();
        }
    }

    bindVoiceControls() {
        const voiceSelect = document.getElementById('voiceSelect');
        const voiceSpeed = document.getElementById('voiceSpeed');
        
        if (voiceSelect) {
            voiceSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.selectedVoice = this.availableVoices[e.target.value];
                } else {
                    this.selectedVoice = null;
                }
            });
        }
        
        if (voiceSpeed) {
            voiceSpeed.addEventListener('change', (e) => {
                this.voiceSpeedValue = parseFloat(e.target.value);
            });
        }
    }

    // CORREÇÃO: Regex corrigida para VS Code
    escapeRegExp(string) {
        // Corrige o escape dos colchetes para o VS Code
        return string.replace(/[.*+?^${}()|[\]\]/g, '\$&');
    }

    createSpeechText(text) {
        let speechText = text;
        
        // Aplica substituições de palavras
        if (this.voiceReplacements.words) {
            for (const [original, replacement] of Object.entries(this.voiceReplacements.words)) {
                const regex = new RegExp(this.escapeRegExp(original), 'gi');
                speechText = speechText.replace(regex, replacement);
            }
        }
        
        // Aplica substituições de frases
        if (this.voiceReplacements.phrases) {
            for (const [original, replacement] of Object.entries(this.voiceReplacements.phrases)) {
                const regex = new RegExp(this.escapeRegExp(original), 'gi');
                speechText = speechText.replace(regex, replacement);
            }
        }
        
        // Aplica substituições de símbolos
        if (this.voiceReplacements.symbols) {
            for (const [original, replacement] of Object.entries(this.voiceReplacements.symbols)) {
                const regex = new RegExp(this.escapeRegExp(original), 'gi');
                speechText = speechText.replace(regex, replacement);
            }
        }
        
        return speechText;
    }

    speak(text, speechText = null) {
        if (!('speechSynthesis' in window)) return;
        
        // Usa texto específico para fala ou aplica substituições automáticas
        const textToSpeak = speechText || this.createSpeechText(text);
        
        // Remove formatação para a fala
        const cleanText = textToSpeak.replace(/[^\w\s\.,!?]/gi, '').replace(/\n/g, ' ');
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'pt-BR';
        utterance.rate = this.voiceSpeedValue || 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }
        
        utterance.onstart = () => {
            window.dispatchEvent(new CustomEvent('speechStart'));
        };
        
        utterance.onend = () => {
            window.dispatchEvent(new CustomEvent('speechEnd'));
        };
        
        utterance.onerror = (event) => {
            console.error('Erro na síntese de fala:', event.error);
            window.dispatchEvent(new CustomEvent('speechError', {
                detail: { error: event.error }
            }));
        };
        
        speechSynthesis.speak(utterance);
    }

    cancelSpeech() {
        speechSynthesis.cancel();
    }
}