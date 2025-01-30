(function() {
    const TC = {
        ver: "1.6",
        promptSelector: '#prompt-textarea', 
        responseSelector: '.markdown',
        modelSelector: 'span.text-token-text-secondary', 
        words: [],
        tokens: [],
        tokenLimit: 8192, 
        updateInterval: 5000, 
        progressBarId: 'token-progress-container',

        init: function() {
            this.promptElement = document.querySelector(this.promptSelector);
            this.responseElements = document.querySelectorAll(this.responseSelector);
            this.len = this.responseElements.length;

            if (this.promptElement) {
                this.promptElement.addEventListener('input', this.run.bind(this));
            }

            this.insertProgressBar(); // Insert the progress bar into the page
            this.run();
            this.startAutoUpdate();
            this.setupModelObserver();
        },

        run: function() {
            this.words = [];
            this.tokens = [];
            let promptWords = 0, responseWords = 0;
            let promptTokens = 0, responseTokens = 0;

            if (this.promptElement) {
                const pw = this.countWords(this.promptElement.value || this.promptElement.innerText);
                promptWords += pw;
                this.words.push(pw);
                const pt = this.estimateTokens(pw);
                promptTokens += pt;
                this.tokens.push(pt);
            }

            this.responseElements = document.querySelectorAll(this.responseSelector);
            this.len = this.responseElements.length;

            this.responseElements.forEach(response => {
                const rw = this.countWords(response.innerText);
                responseWords += rw;
                this.words.push(rw);
                const rt = this.estimateTokens(rw);
                responseTokens += rt;
                this.tokens.push(rt);
            });

            const totals = {
                usedTokens: promptTokens + responseTokens,
                maxTokens: this.tokenLimit,
                remainingTokens: Math.max(this.tokenLimit - (promptTokens + responseTokens), 0)
            };

            this.updateProgressBar(totals.usedTokens, totals.maxTokens, totals.remainingTokens);
        },

        estimateTokens: function(wordCount) {
            const averageTokensPerWord = 1.33;
            return Math.round(wordCount * averageTokensPerWord);
        },

        countWords: function(str) {
            str = str.trim();
            if (str === "") return 0;
            const words = str.match(/\b[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*\b/g);
            return words ? words.length : 0;
        },

        insertProgressBar: function() {
            if (document.getElementById(this.progressBarId)) return;

            const targetDiv = document.querySelector('.w-full');
            if (!targetDiv) {
                console.warn("Unable to find the target div with class 'w-full'.");
                return;
            }

            this.progressContainer = document.createElement('div');
            this.progressContainer.id = this.progressBarId;
            Object.assign(this.progressContainer.style, {
                width: '100%',
                height: '20px',
                padding: '10px',
                backgroundColor: '#f3f4f6',
                color: '#333',
                borderRadius: '6px',
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                marginBottom: '10px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            });

            const title = document.createElement('div');
            title.innerHTML = '<b>Token Usage</b>';
            Object.assign(title.style, { marginBottom: '5px' });
            this.progressContainer.appendChild(title);

            this.progressBarBackground = document.createElement('div');
            Object.assign(this.progressBarBackground.style, {
                width: '100%',
                height: '12px',
                backgroundColor: '#ddd',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '5px'
            });
            this.progressContainer.appendChild(this.progressBarBackground);

            this.progressBarFill = document.createElement('div');
            Object.assign(this.progressBarFill.style, {
                height: '100%',
                width: '0%',
                backgroundColor: '#4caf50',
                borderRadius: '6px 0 0 6px',
                transition: 'width 0.5s ease, background-color 0.5s ease'
            });
            this.progressBarBackground.appendChild(this.progressBarFill);

            this.progressText = document.createElement('div');
            this.progressText.innerText = `0 / ${this.tokenLimit} tokens | Remaining: ${this.tokenLimit}`;
            Object.assign(this.progressText.style, { fontSize: '12px' });
            this.progressContainer.appendChild(this.progressText);

            targetDiv.prepend(this.progressContainer);
        },

        updateProgressBar: function(used, max, remaining) {
            let percentage = (used / max) * 100;
            if (percentage > 100) percentage = 100;
            this.progressBarFill.style.width = `${percentage}%`;

            if (percentage < 50) {
                this.progressBarFill.style.backgroundColor = '#4caf50';
            } else if (percentage < 80) {
                this.progressBarFill.style.backgroundColor = '#ff9800';
            } else {
                this.progressBarFill.style.backgroundColor = '#f44336';
            }

            this.progressText.innerText = `${used} / ${max} tokens | Remaining: ${remaining}`;
        },

        startAutoUpdate: function() {
            setInterval(() => {
                this.run();
            }, this.updateInterval);
        },

        setupModelObserver: function() {
            const observer = new MutationObserver(() => this.detectModelAndSetLimit());
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            this.detectModelAndSetLimit();
        },

        detectModelAndSetLimit: function() {
            const modelElements = document.querySelectorAll('span.text-token-text-secondary');

            if (modelElements.length > 1) {
                const modelName = modelElements[1].innerText.toLowerCase();
                console.log("Model found: " + modelName);

                const modelTokenMap = {
                    '4o': 8192,
                    'o1-mini': 64000,
                    'o1': 32000
                };

                let newTokenLimit = this.tokenLimit;
                for (const [model, limit] of Object.entries(modelTokenMap)) {
                    if (modelName.indexOf(model.toLowerCase()) !== -1) {
                        console.log(modelName + " Found!");
                        newTokenLimit = limit;
                        break;
                    }
                }

                if (newTokenLimit !== this.tokenLimit) {
                    this.tokenLimit = newTokenLimit;
                    this.updateProgressBarDisplay();
                    this.run();
                }
            } else {
                console.warn("Unable to find the model name using the provided selector.");
            }
        },

        updateProgressBarDisplay: function() {
            if (this.progressText) {
                const currentText = this.progressText.innerText;
                const usedTokensMatch = currentText.match(/^(\d+)\s*\/\s*\d+\s*tokens/);
                let usedTokens = 0;
                if (usedTokensMatch && usedTokensMatch[1]) {
                    usedTokens = parseInt(usedTokensMatch[1], 10);
                }
                let remainingTokens = Math.max(this.tokenLimit - usedTokens, 0);
                this.progressText.innerText = `${usedTokens} / ${this.tokenLimit} tokens | Remaining: ${remainingTokens}`;
            }
        }
    };

    TC.init();
})();