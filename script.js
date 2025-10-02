class CalmTypingTest {
    constructor() {
        this.text = '';
        this.currentIndex = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.timeLeft = 0;
        this.errors = 0;
        this.isRunning = false;
        this.typedHistory = [];
        
        this.elements = {
            textDisplay: document.getElementById('textDisplay'),
            typingInput: document.getElementById('typingInput'),
            testArea: document.getElementById('testArea'),
            wpm: document.getElementById('wpm'),
            accuracy: document.getElementById('accuracy'),
            timer: document.getElementById('timer'),
            fileInput: document.getElementById('fileInput'),
            loadFile: document.getElementById('loadFile'),
            restartBtn: document.getElementById('restartBtn'),
            newTextBtn: document.getElementById('newTextBtn')
        };

        this.init();
    }

    init() {
        this.elements.loadFile.addEventListener('click', () => this.loadFile());
        this.elements.restartBtn.addEventListener('click', () => this.restartTest());
        this.elements.newTextBtn.addEventListener('click', () => this.newText());
        this.elements.typingInput.addEventListener('input', (e) => this.handleInput(e));
        this.elements.typingInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.elements.typingInput.addEventListener('focus', () => this.activateTestArea());
        this.elements.typingInput.addEventListener('blur', () => this.deactivateTestArea());
    }

    activateTestArea() {
        this.elements.testArea.classList.add('active');
        this.elements.textDisplay.classList.add('active');
    }

    deactivateTestArea() {
        this.elements.testArea.classList.remove('active');
        if (!this.isRunning) {
            this.elements.textDisplay.classList.remove('active');
        }
    }

    async loadFile() {
        const file = this.elements.fileInput.files[0];
        if (!file) {
            alert('Please select a file');
            return;
        }

        try {
            let text = '';
            
            if (file.type === 'application/pdf') {
                text = await this.extractTextFromPDF(file);
            } else if (file.type === 'text/plain') {
                text = await this.readTextFile(file);
            } else {
                alert('Unsupported file type. Please upload a PDF or TXT file.');
                return;
            }

            this.setText(text);
            this.elements.typingInput.disabled = false;
            this.elements.restartBtn.disabled = false;
            setTimeout(() => this.elements.typingInput.focus(), 100);
            
        } catch (error) {
            console.error('Error loading file:', error);
            alert('Error loading file. Please try again.');
        }
    }

    async extractTextFromPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let text = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            text += textContent.items.map(item => item.str).join(' ') + ' ';
        }

        return this.cleanText(text);
    }

    readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = this.cleanText(e.target.result);
                resolve(text);
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,!?;:()'-]/g, '')
            .trim()
            .substring(0, 1500);
    }

    setText(text) {
        this.text = text;
        this.currentIndex = 0;
        this.errors = 0;
        this.timeLeft = 0;
        this.isRunning = false;
        this.typedHistory = [];
        
        this.updateDisplay();
        this.elements.typingInput.value = '';
        this.elements.wpm.textContent = '0';
        this.elements.accuracy.textContent = '100%';
        this.elements.timer.textContent = '∞';
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    updateDisplay() {
        const typed = this.text.substring(0, this.currentIndex);
        const current = this.text[this.currentIndex] || '';
        const remaining = this.text.substring(this.currentIndex + 1);

        this.elements.textDisplay.innerHTML = `
            <span class="typed-correct">${this.highlightText(typed)}</span>
            <span class="current-char">${current}</span>
            <span class="untyped">${remaining}</span>
        `;
    }

    highlightText(text) {
        return text
            .replace(/ /g, '&nbsp;')
            .replace(/\n/g, '<br>');
    }

    handleKeydown(e) {
        if (e.key === 'Backspace') {
            e.preventDefault();
            this.handleBackspace();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.elements.typingInput.blur();
        }
    }

    handleBackspace() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            
            // Remove the last character from history
            if (this.typedHistory.length > 0) {
                this.typedHistory.pop();
            }
            
            this.updateDisplay();
            this.updateStats();
            this.scrollToCurrent();
        }
    }

    handleInput(e) {
        if (!this.isRunning) {
            this.startTest();
        }

        const input = e.data;
        if (input === null) {
            return; // Handled by handleKeydown
        }

        if (this.currentIndex >= this.text.length) {
            this.finishTest();
            return;
        }

        const expectedChar = this.text[this.currentIndex];
        
        // Record the typed character
        this.typedHistory.push({
            expected: expectedChar,
            actual: input,
            correct: input === expectedChar,
            timestamp: Date.now()
        });

        if (input === expectedChar) {
            this.currentIndex++;
        } else {
            this.errors++;
        }

        this.updateDisplay();
        this.updateStats();
        this.scrollToCurrent();
    }

    startTest() {
        this.isRunning = true;
        this.startTime = Date.now();
        this.startTimer();
        this.activateTestArea();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timeLeft = Math.floor((Date.now() - this.startTime) / 1000);
            this.elements.timer.textContent = `${this.timeLeft}s`;
            this.updateStats();
        }, 1000);
    }

    updateStats() {
        if (!this.startTime) return;

        const timeElapsed = (Date.now() - this.startTime) / 1000 / 60;
        const wordsTyped = this.currentIndex / 5;
        const wpm = timeElapsed > 0 ? Math.round(wordsTyped / timeElapsed) : 0;
        
        const totalChars = this.currentIndex + this.errors;
        const accuracy = totalChars > 0 
            ? Math.max(0, Math.round(((this.currentIndex - this.errors) / totalChars) * 100))
            : 100;

        this.elements.wpm.textContent = wpm;
        this.elements.accuracy.textContent = `${accuracy}%`;
    }

    scrollToCurrent() {
        const currentChar = this.elements.textDisplay.querySelector('.current-char');
        if (currentChar) {
            currentChar.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center', 
                inline: 'center' 
            });
        }
    }

    finishTest() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.elements.typingInput.disabled = true;
        this.deactivateTestArea();
        
        setTimeout(() => {
            const finalWpm = this.elements.wpm.textContent;
            const finalAccuracy = this.elements.accuracy.textContent;
            alert(`Practice complete! 🎉\n\nFinal WPM: ${finalWpm}\nAccuracy: ${finalAccuracy}\n\nTake a deep breath and continue when you're ready.`);
        }, 300);
    }

    restartTest() {
        this.setText(this.text);
        this.elements.typingInput.disabled = false;
        setTimeout(() => this.elements.typingInput.focus(), 100);
    }

    newText() {
        this.elements.fileInput.value = '';
        this.elements.textDisplay.textContent = 'Upload a file to begin your peaceful typing session...';
        this.elements.textDisplay.classList.remove('active');
        this.elements.typingInput.disabled = true;
        this.elements.restartBtn.disabled = true;
        this.elements.wpm.textContent = '0';
        this.elements.accuracy.textContent = '100%';
        this.elements.timer.textContent = '∞';
        this.elements.testArea.classList.remove('active');
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }
}

// Initialize with calm vibes
document.addEventListener('DOMContentLoaded', () => {
    new CalmTypingTest();
});