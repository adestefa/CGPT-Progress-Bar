// TOKEN COUNTER WITH FLOATING PROGRESS BAR
(function() {
    console.log("ChatGPT Token Counter Extension Loaded");

    const TC = {
        ver             : "3.0",
        prompts         : [],
        responses       : [],
        words           : [],
        tokens          : [],
        len             : 0,
        token_limit     : 8192,
        update_interval : 5000, // Update every 5 seconds

        init : function() {
            console.log("Initializing Token Counter");
            // Update selectors based on actual class names
            this.prompts = document.querySelectorAll('.user-message .message-content');
            this.responses = document.querySelectorAll('.assistant-message .message-content');
            this.len = Math.min(this.prompts.length, this.responses.length);
            console.log(`Found ${this.prompts.length} prompt(s) and ${this.responses.length} response(s).`);
            this.createProgressBar();
            this.run(); // Initial run
            this.startAutoUpdate();
            this.observeMutations();
        },

        run : function () {
            console.log("Running Token Counter");
            this.words = [];
            this.tokens = [];
            let p_total_words = 0;
            let r_total_words = 0;
            let p_total_tokens = 0;
            let r_total_tokens = 0;

            console.log(`Found ${this.prompts.length} prompt(s) and ${this.responses.length} response(s).`);

            for (let i = 0; i < this.len; i++) {
                
                // Count number of words in prompt and response
                let promptTextwords = this.countWords(this.prompts[i].innerText);
                let responseTextwords = this.countWords(this.responses[i].innerText);
                p_total_words += promptTextwords;
                r_total_words += responseTextwords;

                this.words.push(promptTextwords, responseTextwords);

                // Estimate tokens for the word count in both
                let promptTokens = this.estimateTokens(promptTextwords);
                let responseTokens = this.estimateTokens(responseTextwords);
                p_total_tokens += promptTokens;
                r_total_tokens += responseTokens;
                this.tokens.push(promptTokens, responseTokens);
            }

            const final = {
                "prompts" : {
                    "words" :  p_total_words,
                    "tokens" : p_total_tokens
                },
                "responses" : {
                    "words" :  r_total_words,
                    "tokens" : r_total_tokens
                },
                "totals" : {
                    "words"         : (p_total_words + r_total_words),
                    "tokens"        : (p_total_tokens + r_total_tokens),
                    "maxresponse"   : 0
                },
            }
            final.totals.maxresponse = (this.token_limit - final.totals.tokens);

            // Update Progress Bar
            this.updateProgressBar(final.totals.tokens, final.totals.maxresponse);

            // Optional: Log details to console
            console.dir(final);
            console.log("Total Words: " + final.totals.words);
            console.log("Total Tokens: " + final.totals.tokens);
            console.log("Max Response Tokens: " + final.totals.maxresponse);
        },

        estimateTokens : function(wordCount) {
            const averageTokensPerWord = 1.33;
            return Math.round(wordCount * averageTokensPerWord);
        },

        countWords : function(str) {
            // Trim the string to remove leading and trailing spaces
            str = str.trim();
            // If the string is empty, return 0
            if (str === "") {
                return 0;
            }
             /**
             * Explanation of the regex:
             * \b           - Word boundary
             * [A-Za-z0-9]+ - One or more alphanumeric characters
             * (?:['-][A-Za-z0-9]+)* - Non-capturing group for contractions or hyphenated words
             * \b           - Word boundary
             */
            const words = str.match(/\b[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*\b/g);

            // If no matches found, return 0
            if (words === null) {
                return 0;
            }

            return words.length;
        },

        // Create the floating progress bar elements
        createProgressBar: function() {
            console.log("Creating Progress Bar");
            // Avoid creating multiple progress bars
            if (document.getElementById('token-progress-container')) return;

            // Create container
            this.progressContainer = document.createElement('div');
            this.progressContainer.id = 'token-progress-container';
            Object.assign(this.progressContainer.style, {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                width: '250px',
                padding: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                borderRadius: '8px',
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                zIndex: '10000',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            });

            // Create title
            const title = document.createElement('div');
            title.innerText = 'ChatGPT Token Usage';
            Object.assign(title.style, {
                marginBottom: '8px',
                fontWeight: 'bold'
            });
            this.progressContainer.appendChild(title);

            // Create progress bar background
            this.progressBarBackground = document.createElement('div');
            Object.assign(this.progressBarBackground.style, {
                width: '100%',
                height: '20px',
                backgroundColor: '#ddd',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '8px'
            });
            this.progressContainer.appendChild(this.progressBarBackground);

            // Create progress bar fill
            this.progressBarFill = document.createElement('div');
            Object.assign(this.progressBarFill.style, {
                height: '100%',
                width: '0%',
                backgroundColor: '#4caf50',
                borderRadius: '10px 0 0 10px',
                transition: 'width 0.5s ease'
            });
            this.progressBarBackground.appendChild(this.progressBarFill);

            // Create text info
            this.progressText = document.createElement('div');
            this.progressText.innerText = '0 / ' + this.token_limit + ' tokens';
            Object.assign(this.progressText.style, {
                fontSize: '12px'
            });
            this.progressContainer.appendChild(this.progressText);

            // Append the container to the body
            document.body.appendChild(this.progressContainer);
        },

        // Update the progress bar based on tokens used
        updateProgressBar: function(used, remaining) {
            console.log(`Updating Progress Bar: ${used} / ${this.token_limit} tokens`);
            const percentage = Math.min((used / this.token_limit) * 100, 100);
            this.progressBarFill.style.width = percentage + '%';

            // Change color based on usage
            if (percentage < 50) {
                this.progressBarFill.style.backgroundColor = '#4caf50'; // Green
            } else if (percentage < 80) {
                this.progressBarFill.style.backgroundColor = '#ff9800'; // Orange
            } else {
                this.progressBarFill.style.backgroundColor = '#f44336'; // Red
            }

            // Update text
            this.progressText.innerText = `${used} / ${this.token_limit} tokens`;
        },

        // Start automatic updates at specified intervals
        startAutoUpdate: function() {
            console.log(`Starting auto-update every ${this.update_interval / 1000} seconds`);
            this.updateIntervalId = setInterval(() => {
                console.log("Auto-updating token count");
                this.run();
            }, this.update_interval);
        },

        // Observe DOM mutations to update token count dynamically
        observeMutations: function() {
            console.log("Setting up MutationObserver");
            const targetNode = document.body;
            const config = { childList: true, subtree: true };

            const callback = (mutationsList) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        console.log("DOM mutation detected, running token counter");
                        this.run();
                    }
                }
            };

            this.observer = new MutationObserver(callback);
            this.observer.observe(targetNode, config);
        },

        // Clean up when the page is unloaded or the extension is disabled
        cleanup: function() {
            console.log("Cleaning up Token Counter");
            if (this.progressContainer) {
                this.progressContainer.remove();
            }
            if (this.updateIntervalId) {
                clearInterval(this.updateIntervalId);
            }
            if (this.observer) {
                this.observer.disconnect();
            }
        }
    }

    // Initialize the Token Counter when the DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log("DOM fully loaded, initializing Token Counter");
            TC.init();
        });
    } else {
        console.log("DOM already loaded, initializing Token Counter");
        TC.init();
    }

    // Optional: Clean up when the page is unloaded
    window.addEventListener('beforeunload', () => TC.cleanup());

})();
