document.addEventListener('DOMContentLoaded', () => {
    // Application State
    let state = {
        releases: [],        // Raw releases from API
        parsedReleases: [],  // Releases with parsed and structured update items
        selectedItem: null,  // { date, type, text, element }
        filters: {
            search: '',
            type: 'all'
        },
        activeHashtags: new Set(['#BigQuery', '#GoogleCloud'])
    };

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const spinner = document.getElementById('spinner');
    const feedContainer = document.getElementById('feed-container');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const typeFiltersContainer = document.getElementById('type-filters');
    
    // Share Composer DOM
    const shareCard = document.getElementById('share-card');
    const shareEmptyState = document.getElementById('share-empty-state');
    const shareComposer = document.getElementById('share-composer');
    const closeComposerBtn = document.getElementById('close-composer-btn');
    const composerSourceDate = document.getElementById('composer-source-date');
    const composerSourceBadge = document.getElementById('composer-source-badge');
    const composerSourceText = document.getElementById('composer-source-text');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const tweetBtn = document.getElementById('tweet-btn');
    const hashtagBtns = document.querySelectorAll('.hashtag-btn');

    // Initialize Lucide Icons
    lucide.createIcons();

    // Fetch releases on load
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', fetchReleases);
    
    searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value.trim().toLowerCase();
        clearSearchBtn.style.display = state.filters.search ? 'block' : 'none';
        renderFeed();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.filters.search = '';
        clearSearchBtn.style.display = 'none';
        renderFeed();
        searchInput.focus();
    });

    typeFiltersContainer.addEventListener('click', (e) => {
        const filterBtn = e.target.closest('.filter-tag');
        if (!filterBtn) return;

        // Toggle active class
        document.querySelectorAll('.filter-tag').forEach(btn => btn.classList.remove('active'));
        filterBtn.classList.add('active');

        // Update state filter and render
        state.filters.type = filterBtn.dataset.type;
        renderFeed();
    });

    closeComposerBtn.addEventListener('click', clearSelection);

    tweetTextarea.addEventListener('input', updateCharCount);

    tweetBtn.addEventListener('click', () => {
        const tweetText = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
    });

    // Hashtag Helper button clicks
    hashtagBtns.forEach(btn => {
        const tag = btn.dataset.tag;
        // Sync button visual state on initial load
        if (state.activeHashtags.has(tag)) {
            btn.classList.add('active');
        }

        btn.addEventListener('click', () => {
            if (state.activeHashtags.has(tag)) {
                state.activeHashtags.delete(tag);
                btn.classList.remove('active');
            } else {
                state.activeHashtags.add(tag);
                btn.classList.add('active');
            }
            regenerateTweetText();
        });
    });

    // Fetch release notes from backend
    async function fetchReleases() {
        setLoading(true);
        clearSelection();
        try {
            const response = await fetch('/api/releases');
            const data = await response.json();
            
            if (data.success && data.entries) {
                state.releases = data.entries;
                processReleases();
                renderFeed();
            } else {
                renderError(data.error || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            renderError('An unexpected connection error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // Process & parse Atom feed entries into structured updates
    function processReleases() {
        state.parsedReleases = state.releases.map(entry => {
            const dateStr = entry.title || 'Unknown Date';
            return {
                id: entry.id,
                date: dateStr,
                link: entry.link,
                updatedRaw: entry.updated,
                updates: parseReleaseHtml(entry.content, dateStr)
            };
        });
    }

    // Parse GCP Release Notes HTML content into atomic items grouped by category
    function parseReleaseHtml(htmlContent, dateStr) {
        if (!htmlContent) return [];
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const parsedUpdates = [];
        
        // Find headings or list items
        let currentType = 'feature'; // Default fallback
        const children = Array.from(doc.body.children);
        
        if (children.length === 0) {
            const text = doc.body.textContent.trim();
            if (text) {
                parsedUpdates.push({ type: 'feature', text: text, rawHtml: doc.body.innerHTML });
            }
            return parsedUpdates;
        }

        children.forEach(child => {
            const tag = child.tagName.toLowerCase();
            
            if (tag === 'h3' || tag === 'h4') {
                const headingText = child.textContent.trim().toLowerCase();
                if (headingText.includes('feature')) {
                    currentType = 'feature';
                } else if (headingText.includes('change')) {
                    currentType = 'changed';
                } else if (headingText.includes('deprecat')) {
                    currentType = 'deprecated';
                } else if (headingText.includes('fix')) {
                    currentType = 'fixed';
                } else {
                    currentType = 'feature'; // fallback
                }
            } else if (tag === 'p') {
                const text = child.textContent.trim();
                if (text) {
                    parsedUpdates.push({ type: currentType, text: text, rawHtml: child.innerHTML });
                }
            } else if (tag === 'ul' || tag === 'ol') {
                const listItems = child.querySelectorAll('li');
                listItems.forEach(li => {
                    const text = li.textContent.trim();
                    if (text) {
                        parsedUpdates.push({ type: currentType, text: text, rawHtml: li.innerHTML });
                    }
                });
            }
        });

        // Fallback for flat layout
        if (parsedUpdates.length === 0) {
            const text = doc.body.textContent.trim();
            if (text) {
                parsedUpdates.push({ type: 'feature', text: text, rawHtml: doc.body.innerHTML });
            }
        }

        return parsedUpdates;
    }

    // Render feed based on filters
    function renderFeed() {
        feedContainer.innerHTML = '';
        let visibleCards = 0;

        state.parsedReleases.forEach(card => {
            // Apply filtering on individual updates inside this card
            const filteredUpdates = card.updates.filter(update => {
                const matchesType = state.filters.type === 'all' || update.type === state.filters.type;
                const matchesSearch = !state.filters.search || update.text.toLowerCase().includes(state.filters.search);
                return matchesType && matchesSearch;
            });

            if (filteredUpdates.length === 0) return; // Hide card if no matching updates

            visibleCards++;
            
            // Build the card HTML
            const cardEl = document.createElement('article');
            cardEl.className = 'date-section';
            
            const headerEl = document.createElement('div');
            headerEl.className = 'date-header';
            headerEl.innerHTML = `
                <h2 class="date-title">${card.date}</h2>
                <a href="${card.link}" target="_blank" rel="noopener noreferrer" class="source-link">
                    <span>Source Doc</span>
                    <i data-lucide="external-link" style="width:14px;height:14px;"></i>
                </a>
            `;
            cardEl.appendChild(headerEl);

            // Group filtered updates by type for beautiful rendering
            const groups = {};
            filteredUpdates.forEach(update => {
                if (!groups[update.type]) groups[update.type] = [];
                groups[update.type].push(update);
            });

            // Order of rendering: Feature, Changed, Deprecated, Fixed
            const typeOrder = ['feature', 'changed', 'deprecated', 'fixed'];
            typeOrder.forEach(type => {
                if (!groups[type]) return;

                const groupEl = document.createElement('div');
                groupEl.className = 'update-group';

                const titleEl = document.createElement('div');
                titleEl.className = `group-title ${type}`;
                titleEl.textContent = type;
                groupEl.appendChild(titleEl);

                const listEl = document.createElement('ul');
                listEl.className = 'update-list';

                groups[type].forEach(update => {
                    const itemEl = document.createElement('li');
                    
                    // Mark as selected if match
                    const isSelected = state.selectedItem && 
                                      state.selectedItem.date === card.date && 
                                      state.selectedItem.text === update.text;
                    
                    itemEl.className = `update-item ${isSelected ? 'selected' : ''}`;
                    itemEl.innerHTML = `
                        <p>${update.rawHtml}</p>
                        <div class="share-action-indicator">
                            <span>Select to Tweet</span>
                            <i data-lucide="twitter" style="width:14px;height:14px;fill:currentColor;"></i>
                        </div>
                    `;

                    // Handle selection event
                    itemEl.addEventListener('click', (e) => {
                        // Prevent clicking actual inside-links from disrupting selection behavior (or let links open)
                        if (e.target.tagName.toLowerCase() === 'a') {
                            window.open(e.target.href, '_blank');
                            return;
                        }
                        
                        selectUpdateItem({
                            date: card.date,
                            type: type,
                            text: update.text
                        }, itemEl);
                    });

                    listEl.appendChild(itemEl);
                });

                groupEl.appendChild(listEl);
                cardEl.appendChild(groupEl);
            });

            feedContainer.appendChild(cardEl);
        });

        // Handle case where no cards are visible
        if (visibleCards === 0) {
            renderNoResults();
        }

        // Re-run Lucide parser to draw icons on dynamically added elements
        lucide.createIcons();
    }

    // Select an update item & populate the Tweet Composer
    function selectUpdateItem(itemData, itemEl) {
        // Deselect previous element
        if (state.selectedItem && state.selectedItem.element) {
            state.selectedItem.element.classList.remove('selected');
        }

        // Store new state
        state.selectedItem = {
            date: itemData.date,
            type: itemData.type,
            text: itemData.text,
            element: itemEl
        };

        // Visual selection update
        itemEl.classList.add('selected');

        // Slide/Show composer panel
        shareEmptyState.style.display = 'none';
        shareComposer.style.display = 'flex';
        shareCard.classList.add('active-composer');

        // Setup preview info
        composerSourceDate.textContent = itemData.date;
        composerSourceBadge.textContent = itemData.type;
        
        // Remove badge classes and add current
        composerSourceBadge.className = `preview-badge ${itemData.type}`;
        composerSourceText.textContent = itemData.text;

        // Automatically focus composer textarea
        regenerateTweetText();
        tweetTextarea.focus();
        
        // Smooth scroll composer into view on mobile
        if (window.innerWidth <= 1024) {
            shareCard.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Regenerate tweet message text based on selection and active hashtags
    function regenerateTweetText() {
        if (!state.selectedItem) return;

        const maxTweetLength = 280;
        const date = state.selectedItem.date;
        const itemText = state.selectedItem.text;
        
        // Dynamic prefix depending on update type
        let prefix = `BigQuery update (${date}): `;
        if (state.selectedItem.type === 'feature') {
            prefix = `New #BigQuery feature (${date}): `;
        }

        // List active tags to add at the end
        const tagsArr = Array.from(state.activeHashtags);
        const tagsSuffix = tagsArr.length > 0 ? `\n\n${tagsArr.join(' ')}` : '';
        
        // Calculate room left for text
        const safeLimit = maxTweetLength - prefix.length - tagsSuffix.length - 5; // buffer
        
        let cleanedText = itemText;
        if (cleanedText.length > safeLimit) {
            cleanedText = cleanedText.substring(0, safeLimit - 3) + '...';
        }

        tweetTextarea.value = `${prefix}${cleanedText}${tagsSuffix}`;
        updateCharCount();
    }

    // Update the character counter visual state
    function updateCharCount() {
        const len = tweetTextarea.value.length;
        charCount.textContent = len;

        // Remove previous categories
        charCount.className = '';
        tweetBtn.disabled = false;

        if (len > 280) {
            charCount.classList.add('error');
            tweetBtn.disabled = true;
        } else if (len > 240) {
            charCount.classList.add('warning');
        }
    }

    // Clear active selection and revert share panel to empty state
    function clearSelection() {
        if (state.selectedItem && state.selectedItem.element) {
            state.selectedItem.element.classList.remove('selected');
        }
        state.selectedItem = null;
        
        shareCard.classList.remove('active-composer');
        shareComposer.style.display = 'none';
        shareEmptyState.style.display = 'block';
    }

    // Loading overlay controls
    function setLoading(isLoading) {
        if (isLoading) {
            refreshBtn.disabled = true;
            spinner.classList.add('spinning');
            // Keep current feed shown but add a semi-opaque styling if content already loaded
            if (state.releases.length > 0) {
                feedContainer.style.opacity = '0.5';
            } else {
                feedContainer.innerHTML = `
                    <div class="loading-state">
                        <div class="pulse-loader"></div>
                        <p>Fetching the latest release notes from Google Cloud...</p>
                    </div>
                `;
            }
        } else {
            refreshBtn.disabled = false;
            spinner.classList.remove('spinning');
            feedContainer.style.opacity = '1';
        }
    }

    // Render error view
    function renderError(message) {
        feedContainer.innerHTML = `
            <div class="error-state">
                <i data-lucide="alert-triangle"></i>
                <h3>Unable to load releases</h3>
                <p>${message}</p>
                <button class="btn btn-primary" style="margin-top: 1.5rem;" onclick="location.reload()">
                    <i data-lucide="refresh-cw"></i>
                    <span>Reload App</span>
                </button>
            </div>
        `;
        lucide.createIcons();
    }

    // Render empty search results view
    function renderNoResults() {
        feedContainer.innerHTML = `
            <div class="no-results-state">
                <i data-lucide="search-code"></i>
                <h3>No matching updates found</h3>
                <p>Try refining your search terms or selecting a different update type filter.</p>
            </div>
        `;
        lucide.createIcons();
    }
});
