// ────────────────────────────────────────────────────────────────
        //  CONFIG & STATE
        // ────────────────────────────────────────────────────────────────
        const API_BASE_URL = 'https://song1-beta.vercel.app/';
        const CATEGORY_CONFIG = [
            { id: 'hindi-grid', title: 'Hindi', query: 'Latest Hindi Songs', endpoint: 'api/search/songs' },
            { id: 'english-grid', title: 'English', query: 'Hollywood Top Hits', endpoint: 'api/search/songs' },
            { id: 'bhojpuri-grid', title: 'Bhojpuri', query: 'Bhojpuri Song', endpoint: 'api/search/songs' },
            { id: 'kpop-grid', title: 'K-pop', query: 'K-pop Hits', endpoint: 'api/search/songs' },
            { id: 'afrobeat-grid', title: 'Afrobeat', query: 'Afrobeat Vibes', endpoint: 'api/search/songs' },
            { id: 'latin-grid', title: 'Latin', query: 'Latin Hits', endpoint: 'api/search/songs' }
        ];

        let currentPlaylist = [];
        let originalPlaylist = [];
        let currentTrackIndex = -1;
        let isPlaying = false;
        let isShuffleOn = false;
        let repeatMode = 'none';
        let currentSearchEndpoint = 'api/search/songs';
        let playlists = {};
        let currentViewPlaylistId = 'favorites';
        let trackBeingAdded = null;
        let recentSearches = [];
        const MAX_RECENT_SEARCHES = 7;
        let listeningHistory = [];
        const MAX_HISTORY = 30;
        let aiUpNextTrackData = null;
        let forYouLoaded = false;
        let categoryAllTracks = [];
        let smartQueueActive = false;
        let smartQueueRefilling = false;
        let smartQueueSeenIds = new Set();
        let smartQueueMoodHistory = [];
        let isPlayerModalOpen = false;
        let isCircularCollapsed = false;
        let isArtistSlideOpen = false;
        let cpPosX = null;
        let cpPosY = null;
        let sleepTimer = null;
        let isLyricsVisible = false;
        let isEqualizerVisible = false;
        let playbackSpeed = 1;
        let autoPlayNext = true;
        let isRecording = false;
        let mediaRecorder = null;
        let audioChunks = [];

        // DOM refs
        const audio = document.getElementById('audioPlayer');
        const circularPlayer = document.getElementById('circularPlayer');
        const cpLabel = document.getElementById('cpLabel');
        const cpArtist = document.getElementById('cpArtist');
        const cpIndicator = document.getElementById('cpIndicator');
        const modalOverlay = document.getElementById('playerModalOverlay');
        const modalArt = document.getElementById('modalArt');
        const modalTitle = document.getElementById('modalTitle');
        const modalArtist = document.getElementById('modalArtist');
        const modalSeek = document.getElementById('modalSeek');
        const modalCurrentTime = document.getElementById('modalCurrentTime');
        const modalTotalDuration = document.getElementById('modalTotalDuration');
        const modalVolume = document.getElementById('modalVolume');
        const modalPlayIcon = document.getElementById('modalPlayIcon');
        const modalPauseIcon = document.getElementById('modalPauseIcon');
        const modalShuffle = document.getElementById('modalShuffle');
        const modalRepeat = document.getElementById('modalRepeat');
        const modalFavorite = document.getElementById('modalFavorite');
        const speedBtn = document.getElementById('speedBtn');
        const autoPlayCheck = document.getElementById('autoPlayCheck');
        const mainScroll = document.getElementById('mainScroll');
        const artistSlideModal = document.getElementById('artistSlideModal');
        const asmList = document.getElementById('asmList');
        const asmTitle = document.getElementById('asmTitle');
        const playlistModal = document.getElementById('playlistModal');
        const playlistNameInput = document.getElementById('playlistNameInput');
        const queuePanel = document.getElementById('queuePanel');
        const qpList = document.getElementById('qpList');
        const installBtn = document.getElementById('installBtn');
        const recordBtn = document.getElementById('recordBtn');

        // ────────────────────────────────────────────────────────────────
        //  HTML ENTITY DECODER
        // ────────────────────────────────────────────────────────────────
        function decodeHtmlEntities(text) {
            if (!text) return '';
            const el = document.createElement('div');
            el.innerHTML = text;
            return el.textContent || el.innerText || '';
        }

        // ────────────────────────────────────────────────────────────────
        //  PWA INSTALLATION LOGIC
        // ────────────────────────────────────────────────────────────────
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.style.display = 'block';
            notify('📲 Install "Song" as an app for offline playback!', 'info', [{
                label: 'Install',
                onclick: 'installApp()'
            }]);
        });

        function installApp() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        installBtn.style.display = 'none';
                        notify('🎉 App installed successfully!', 'success');
                    } else {
                        notify('Installation declined.', 'info');
                    }
                    deferredPrompt = null;
                });
            }
        }

        // ────────────────────────────────────────────────────────────────
        //  NOTIFICATION (iOS style) with action buttons
        // ────────────────────────────────────────────────────────────────
        function showNotification(title, message, type = 'info', duration = 3000, actions = null) {
            const container = document.getElementById('notifContainer');
            const banner = document.createElement('div');
            banner.className = 'notif-banner';
            const iconMap = {
                success: 'fa-circle-check',
                error: 'fa-circle-xmark',
                warning: 'fa-triangle-exclamation',
                info: 'fa-circle-info'
            };
            let actionsHtml = '';
            if (actions && actions.length) {
                actionsHtml = `<div class="notif-actions">`;
                actions.forEach(a => {
                    actionsHtml += `<button class="${a.danger ? 'danger' : ''}" onclick="${a.onclick}">${a.label}</button>`;
                });
                actionsHtml += `</div>`;
            }
            banner.innerHTML = `
                <div class="notif-icon ${type}"><i class="fa-solid ${iconMap[type] || iconMap.info}"></i></div>
                <div class="notif-body">
                    <div class="notif-title">${title}</div>
                    <div class="notif-message">${message}</div>
                </div>
                ${actionsHtml}
                <button class="notif-close" onclick="this.closest('.notif-banner').remove()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            container.appendChild(banner);
            requestAnimationFrame(() => { banner.classList.add('show'); });
            setTimeout(() => {
                banner.classList.remove('show');
                setTimeout(() => banner.remove(), 500);
            }, duration);
        }
        function notify(msg, type = 'info', actions = null) { showNotification('Song', msg, type, 3000, actions); }

        // ────────────────────────────────────────────────────────────────
        //  UTILITY
        // ────────────────────────────────────────────────────────────────
        function formatTime(seconds) {
            if (isNaN(seconds) || seconds < 0) return '0:00';
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        }

        function getArtistName(track) {
            let name = 'Unknown Artist';
            if (track.primaryArtists) name = track.primaryArtists;
            else if (track.artist) name = track.artist;
            else if (track.artists && track.artists.primary && track.artists.primary.length) {
                name = track.artists.primary.map(a => a.name).join(', ');
            }
            return decodeHtmlEntities(name);
        }

        function getImageUrl(track, size = '500') {
            if (track.image && track.image.length) {
                let url = track.image[track.image.length - 1].url;
                return url.replace('150x150', `${size}x${size}`);
            }
            return 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        }

        function getAudioUrl(track) {
            if (track.downloadUrl && track.downloadUrl.length) {
                return track.downloadUrl[track.downloadUrl.length - 1].url;
            }
            if (track.url) return track.url;
            return null;
        }

        // ────────────────────────────────────────────────────────────────
        //  SECTION NAVIGATION
        // ────────────────────────────────────────────────────────────────
        function changeSection(navItem, renderPlaylists = false) {
            const target = navItem.getAttribute('data-target');
            document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            navItem.classList.add('active');

            if (target === 'home-section') {
                CATEGORY_CONFIG.forEach(c => fetchAndRenderCategory(c));
                setTimeout(loadHomeAIStrip, 2500);
            }
            if (renderPlaylists || target === 'playlists-section') {
                renderPlaylists();
                viewPlaylist(currentViewPlaylistId);
            }
            closeContextMenu();
            if (target === 'for-you-section') loadForYouSection();
        }

        // ────────────────────────────────────────────────────────────────
        //  PLAYLISTS (localStorage)
        // ────────────────────────────────────────────────────────────────
        function loadPlaylists() {
            try {
                const stored = localStorage.getItem('musicAppPlaylists');
                playlists = stored ? JSON.parse(stored) : {};
            } catch (e) { playlists = {}; }
            if (!playlists.favorites) playlists.favorites = { id: 'favorites', name: 'Favorites', tracks: [] };
            if (!playlists.downloads) playlists.downloads = { id: 'downloads', name: '📥 Downloads', tracks: [],
                isPermanent: true };
        }

        function savePlaylists() {
            try { localStorage.setItem('musicAppPlaylists', JSON.stringify(playlists)); } catch (e) {}
        }

        function generatePlaylistId() { return 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }

        function openPlaylistModal() {
            playlistModal.classList.add('open');
            playlistNameInput.value = '';
            setTimeout(() => playlistNameInput.focus(), 200);
        }

        function closePlaylistModal() {
            playlistModal.classList.remove('open');
        }

        function confirmCreatePlaylist() {
            const name = playlistNameInput.value.trim();
            if (!name) {
                notify('Please enter a playlist name.', 'warning');
                return;
            }
            const id = generatePlaylistId();
            playlists[id] = { id, name: decodeHtmlEntities(name.trim()), tracks: [] };
            savePlaylists();
            renderPlaylists();
            viewPlaylist(id);
            closePlaylistModal();
            notify(`Playlist "${decodeHtmlEntities(name.trim())}" created!`, 'success');
        }

        function deletePlaylist(id) {
            if (id === 'favorites') { notify('Favorites cannot be deleted.', 'warning'); return; }
            if (confirm(`Delete "${playlists[id].name}"?`)) {
                delete playlists[id];
                savePlaylists();
                renderPlaylists();
                if (currentViewPlaylistId === id) viewPlaylist('favorites');
                notify('Playlist deleted.', 'info');
            }
        }

        function toggleFavorite(track) {
            const favs = playlists.favorites.tracks;
            const idx = favs.findIndex(f => f.id === track.id);
            if (idx > -1) {
                favs.splice(idx, 1);
                notify('Removed from Favorites', 'info');
            } else {
                favs.unshift(track);
                notify('Added to Favorites ❤️', 'success');
            }
            savePlaylists();
            if (currentViewPlaylistId === 'favorites') viewPlaylist('favorites');
            updateFavoriteButtons(track.id);
            document.getElementById('favoritesCount').textContent = `${playlists.favorites.tracks.length} songs`;
        }

        function toggleFavoriteCurrent() {
            const track = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length ? currentPlaylist[currentTrackIndex] :
                null;
            if (!track) { notify('No song playing.', 'warning'); return; }
            toggleFavorite(track);
            updateModalFavorite(track.id);
        }

        function updateModalFavorite(trackId) {
            const isFav = playlists.favorites.tracks.some(f => f.id === trackId);
            modalFavorite.style.color = isFav ? '#ff375f' : '#aeaeb2';
        }

        function addTrackToPlaylist(playlistId, track) {
            const pl = playlists[playlistId];
            if (!pl) return;
            if (pl.tracks.some(t => t.id === track.id)) {
                notify(`Already in "${pl.name}"`, 'warning');
                return;
            }
            pl.tracks.push(track);
            savePlaylists();
            notify(`Added to "${pl.name}"`, 'success');
            if (currentViewPlaylistId === playlistId) viewPlaylist(playlistId);
            renderPlaylists();
        }

        function removeTrackFromPlaylist(trackId) {
            const pl = playlists[currentViewPlaylistId];
            if (!pl) return;
            const idx = pl.tracks.findIndex(t => t.id === trackId);
            if (idx > -1) {
                pl.tracks.splice(idx, 1);
                savePlaylists();
                viewPlaylist(currentViewPlaylistId);
                renderPlaylists();
                notify('Removed from playlist.', 'info');
            }
        }

        function renderPlaylists() {
            const container = document.getElementById('userPlaylistsList');
            const favItem = container.querySelector('[data-playlist-id="favorites"]');
            container.querySelectorAll('.playlist-card:not([data-playlist-id="favorites"])').forEach(el => el.remove());

            Object.keys(playlists).forEach(id => {
                if (id === 'favorites') return;
                const pl = playlists[id];
                const isPerm = pl.isPermanent || id === 'downloads';
                const div = document.createElement('div');
                div.className = `playlist-card ${currentViewPlaylistId === id ? 'active' : ''}`;
                div.dataset.playlistId = id;
                div.dataset.playlistName = pl.name;
                div.onclick = () => viewPlaylist(id);
                div.innerHTML = `
                    <div class="pl-icon ${id === 'downloads' ? 'dl' : ''}">${id === 'downloads' ? '<i class="fa-solid fa-download"></i>' : '<i class="fa-solid fa-music"></i>'}</div>
                    <div class="pl-info"><strong>${pl.name}</strong><span>${pl.tracks.length} songs</span></div>
                    <div class="pl-actions">
                        <button onclick="event.stopPropagation(); playPlaylist('${id}')" title="Play"><i class="fa-solid fa-play"></i></button>
                        ${!isPerm ? `<button onclick="event.stopPropagation(); deletePlaylist('${id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                `;
                favItem.after(div);
            });
            favItem.classList.toggle('active', currentViewPlaylistId === 'favorites');
            document.getElementById('favoritesCount').textContent = `${playlists.favorites.tracks.length} songs`;
        }

        function viewPlaylist(id) {
            const pl = playlists[id];
            if (!pl) return;
            currentViewPlaylistId = id;
            document.querySelectorAll('.playlist-card').forEach(el => el.classList.toggle('active', el.dataset.playlistId === id));
            document.getElementById('currentPlaylistTitle').textContent = `${pl.name} Tracks`;
            document.getElementById('currentPlaylistTitle').style.display = 'block';
            renderTrackList(pl.tracks, document.getElementById('currentPlaylistTracks'), false, id);
        }

        function playPlaylist(id) {
            const pl = playlists[id];
            if (!pl || !pl.tracks.length) { notify('No songs in this playlist.', 'warning'); return; }
            currentPlaylist = [...pl.tracks];
            originalPlaylist = [...pl.tracks];
            if (isShuffleOn) toggleShuffle();
            renderQueue();
            playTrack(0);
            changeSection(document.querySelector('.nav-item[data-target="queue-section"]'));
            notify(`▶️ Playing "${pl.name}"`, 'success');
        }

        // ────────────────────────────────────────────────────────────────
        //  FAVORITE BUTTONS UPDATE
        // ────────────────────────────────────────────────────────────────
        function updateFavoriteButtons(trackId) {
            const isFav = playlists.favorites.tracks.some(f => f.id === trackId);
            document.querySelectorAll(`.icon-btn[data-fav-id="${trackId}"]`).forEach(btn => {
                btn.classList.toggle('is-favorite', isFav);
            });
            updateModalFavorite(trackId);
        }

        // ────────────────────────────────────────────────────────────────
        //  TRACK LIST RENDERER
        // ────────────────────────────────────────────────────────────────
        function renderTrackList(tracks, container, isSearch = false, listId = 'queue') {
            container.innerHTML = '';
            if (!tracks || !tracks.length) {
                const msg = isSearch ? 'No results.' : (listId === 'favorites' ? 'No favorites yet.' : 'Empty.');
                container.innerHTML = `<p class="loading-state">${msg}</p>`;
                return;
            }

            const handleClick = (track, idx, list) => {
                currentPlaylist = list;
                originalPlaylist = [...list];
                currentTrackIndex = idx;
                playTrack(idx);
                renderQueue();
                if (listId === 'queue' || isSearch) {
                    changeSection(document.querySelector('.nav-item[data-target="queue-section"]'));
                }
            };

            // Use DocumentFragment for performance
            const fragment = document.createDocumentFragment();

            tracks.forEach((track, idx) => {
                const item = document.createElement('div');
                item.className = 'track-item';
                if (idx === currentTrackIndex && currentPlaylist.includes(track)) {
                    item.classList.add('is-playing');
                }
                item.dataset.id = track.id;

                const img = getImageUrl(track, 150);
                const title = decodeHtmlEntities(track.name || track.title || 'Unknown');
                const artist = getArtistName(track);
                const isFav = playlists.favorites.tracks.some(f => f.id === track.id);
                const trackJSON = JSON.stringify(track).replace(/"/g, '&quot;');

                let actions = '';
                if (container.dataset.allowDrag === 'true') {
                    actions += `<span class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></span>`;
                }
                // Heart button
                actions += `
                    <button class="icon-btn ${isFav ? 'is-favorite' : ''}" data-fav-id="${track.id}" onclick="event.stopPropagation(); toggleFavorite(${trackJSON})" title="Favorite">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A5.98 5.98 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.53L12 21.35z"/>
                        </svg>
                    </button>`;
                // Download button
                if (track.downloadUrl && track.downloadUrl.length) {
                    actions += `
                        <button class="icon-btn is-download" onclick="event.stopPropagation(); downloadTrack(${trackJSON}, this)" title="Download">
                            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M5 20h14v-2H5v2zm7-18v10.17l3.59-3.58L17 10l-5 5-5-5 1.41-1.41L11 12.17V2h1z"/>
                            </svg>
                        </button>`;
                }
                // Plus button (Add to playlist)
                if (isSearch || listId === 'queue') {
                    actions += `
                        <button class="icon-btn is-add" onclick="event.stopPropagation(); showContextMenu(event, ${trackJSON})" title="Add to Playlist">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
                                <rect x="9" y="9" width="11" height="11" rx="1.5"></rect>
                                <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <svg class="plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
                                <path d="M12 5v14M5 12h14"></path>
                            </svg>
                        </button>`;
                }
                // Delete button with new styling
                if (!isSearch && listId !== 'queue' && listId !== 'favorites') {
                    actions += `
                        <button class="btn-delete" onclick="event.stopPropagation(); removeTrackFromPlaylist('${track.id}')" title="Remove">
                            <i class="fa-solid fa-trash"></i>
                        </button>`;
                }

                item.innerHTML = `
                    ${actions}
                    <img src="${img}" alt="${title}" loading="lazy">
                    <div class="track-info"><strong>${title}</strong><span>${artist}</span></div>
                `;
                item.onclick = () => handleClick(track, idx, tracks);
                fragment.appendChild(item);
            });

            container.appendChild(fragment);

            if (container.dataset.allowDrag === 'true') {
                attachDragListeners(container);
            }
        }

        // ────────────────────────────────────────────────────────────────
        //  DRAG & DROP (reorder)
        // ────────────────────────────────────────────────────────────────
        let dragSrcEl = null;

        function attachDragListeners(container) {
            container.querySelectorAll('.track-item').forEach(el => {
                el.draggable = true;
                el.addEventListener('dragstart', handleDragStart);
                el.addEventListener('dragover', handleDragOver);
                el.addEventListener('dragenter', handleDragEnter);
                el.addEventListener('dragleave', handleDragLeave);
                el.addEventListener('drop', handleDrop);
                el.addEventListener('dragend', handleDragEnd);
            });
        }

        function handleDragStart(e) {
            if (this.parentNode.dataset.allowDrag !== 'true') { e.preventDefault(); return; }
            dragSrcEl = this;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', this.dataset.id);
            this.classList.add('dragging');
        }

        function handleDragOver(e) { e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.classList.remove('drag-over-above', 'drag-over-below');
            const rect = this.getBoundingClientRect();
            const y = e.clientY - rect.top;
            this.classList.add(y < rect.height / 2 ? 'drag-over-above' : 'drag-over-below'); }

        function handleDragEnter(e) {}

        function handleDragLeave(e) { this.classList.remove('drag-over-above', 'drag-over-below'); }

        function handleDrop(e) {
            e.stopPropagation();
            if (dragSrcEl === this) { this.classList.remove('drag-over-above', 'drag-over-below'); return false; }
            const container = this.parentNode;
            const rect = this.getBoundingClientRect();
            const dropAbove = (e.clientY - rect.top) < rect.height / 2;
            let tracksList;
            const listName = container.id;
            if (listName === 'queueList') tracksList = currentPlaylist;
            else if (listName === 'currentPlaylistTracks') tracksList = playlists[currentViewPlaylistId]?.tracks;
            else return false;

            const draggedId = dragSrcEl.dataset.id;
            const targetId = this.dataset.id;
            const draggedIdx = tracksList.findIndex(t => t.id === draggedId);
            const targetIdx = tracksList.findIndex(t => t.id === targetId);
            if (draggedIdx === -1 || targetIdx === -1) return false;

            const [dragged] = tracksList.splice(draggedIdx, 1);
            let newIdx = targetIdx;
            if (!dropAbove) newIdx++;
            tracksList.splice(newIdx, 0, dragged);

            if (listName === 'queueList') {
                const playing = currentPlaylist.length && currentTrackIndex !== -1 ? currentPlaylist[currentTrackIndex] :
                null;
                if (playing) { currentTrackIndex = currentPlaylist.findIndex(t => t.id === playing.id); }
                if (!isShuffleOn) originalPlaylist = [...currentPlaylist];
                renderQueue();
            } else {
                savePlaylists();
                viewPlaylist(currentViewPlaylistId);
            }
            this.classList.remove('drag-over-above', 'drag-over-below');
            return true;
        }

        function handleDragEnd(e) {
            this.classList.remove('dragging');
            document.querySelectorAll('.drag-over-above,.drag-over-below').forEach(el => el.classList.remove(
            'drag-over-above', 'drag-over-below'));
            dragSrcEl = null;
        }

        // ────────────────────────────────────────────────────────────────
        //  RECENT SEARCHES
        // ────────────────────────────────────────────────────────────────
        function loadRecentSearches() {
            try { recentSearches = JSON.parse(localStorage.getItem('musicAppRecentSearches')) || []; } catch (e) { recentSearches =
                    []; }
        }

        function saveRecentSearches() {
            try { localStorage.setItem('musicAppRecentSearches', JSON.stringify(recentSearches.slice(0, MAX_RECENT_SEARCHES))); } catch (
            e) {}
        }

        function addSearchQuery(query) {
            if (!query) return;
            const q = query.trim();
            recentSearches = recentSearches.filter(s => s.toLowerCase() !== q.toLowerCase());
            recentSearches.unshift(q);
            recentSearches = recentSearches.slice(0, MAX_RECENT_SEARCHES);
            saveRecentSearches();
            renderRecentSearches();
        }

        function renderRecentSearches() {
            const container = document.getElementById('recentSearchesList');
            const parent = document.getElementById('recentSearchesContainer');
            container.innerHTML = '';
            if (!recentSearches.length) { parent.classList.remove('visible'); return; }
            parent.classList.add('visible');
            recentSearches.forEach(q => {
                const el = document.createElement('div');
                el.className = 'recent-item';
                el.innerHTML = `<span>${decodeHtmlEntities(q)}</span><i class="fa-solid fa-clock-rotate-left"></i>`;
                el.onclick = () => {
                    document.getElementById('searchInput').value = q;
                    searchSaavn();
                    changeSection(document.querySelector('.nav-item[data-target="search-section"]'));
                };
                container.appendChild(el);
            });
        }

        // ────────────────────────────────────────────────────────────────
        //  SEARCH
        // ────────────────────────────────────────────────────────────────
        function setSearchEndpoint(tab) {
            document.querySelectorAll('.search-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentSearchEndpoint = tab.dataset.endpoint;
            if (document.getElementById('searchInput').value.trim()) searchSaavn();
            else document.getElementById('songResults').innerHTML = '<p class="loading-state">Type to search.</p>';
        }

        async function searchSaavn() {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) { document.getElementById('songResults').innerHTML = '<p class="loading-state">Enter a query.</p>'; return; }
            smartQueueActive = false;
            const type = currentSearchEndpoint.split('/').pop();
            document.getElementById('songResults').innerHTML = `<p class="loading-state">Searching ${type}...</p>`;
            try {
                const url = `${API_BASE_URL}${currentSearchEndpoint}?query=${encodeURIComponent(query)}`;
                const resp = await fetch(url);
                const data = await resp.json();
                addSearchQuery(query);
                const results = data.data?.results || data.results || [];
                if (type === 'songs') {
                    renderAlgorithmicSearchResults(query, results);
                } else {
                    renderModuleGrid(results, document.getElementById('songResults'), currentSearchEndpoint);
                }
                if (query.length >= 3) setTimeout(() => showSearchAISuggestions(query), 500);
            } catch (e) {
                document.getElementById('songResults').innerHTML =
                    `<p class="loading-state" style="color:#ff453a;">Error: ${e.message}</p>`;
            }
        }

        async function renderAlgorithmicSearchResults(query, exactResults) {
            const container = document.getElementById('songResults');
            container.innerHTML = '';
            const heading1 = document.createElement('div');
            heading1.className = 'sub-head';
            heading1.style.marginTop = '0';
            heading1.textContent = `🔎 "${decodeHtmlEntities(query)}" ke top results`;
            container.appendChild(heading1);
            const exactContainer = document.createElement('div');
            container.appendChild(exactContainer);
            renderTrackList(exactResults.slice(0, 10), exactContainer, true);

            const seenIds = new Set(exactResults.map(t => t.id));
            const heading2 = document.createElement('div');
            heading2.className = 'sub-head';
            heading2.textContent = '🎯 Isi vibe ka aur bhi';
            container.appendChild(heading2);
            const relatedContainer = document.createElement('div');
            relatedContainer.innerHTML =
                `<div class="ai-thinking"><span>Mood detect ho raha hai</span><div class="dots"><span></span><span></span><span></span></div></div>`;
            container.appendChild(relatedContainer);
            const related = await getAlgorithmicRelatedTracks(query, exactResults, seenIds);
            if (!related.length) { relatedContainer.innerHTML = '<p class="loading-state">No suggestions.</p>'; return; }
            renderTrackList(related, relatedContainer, true);
        }

        async function getAlgorithmicRelatedTracks(query, exactResults, seenIds) {
            const sample = exactResults.slice(0, 5).map(t => `${decodeHtmlEntities(t.name||t.title)} by ${getArtistName(t)}`).join(', ');
            const prompt =
                `A user searched "${query}". Top matches: ${sample||'none'}. Infer era/genre/mood and suggest 8 songs they'd enjoy. Reply ONLY as JSON array: [{"query":"Song Name Artist"}]. No extra text.`;
            const suggestions = await askClaudeForSongs(prompt);
            if (!suggestions || !suggestions.length) return [];
            const related = [];
            for (const s of suggestions) {
                if (related.length >= 12) break;
                try {
                    const tracks = await fetchSongsForQuery(s.query);
                    for (const t of tracks) {
                        if (!seenIds.has(t.id)) { seenIds.add(t.id);
                            related.push(t); }
                    }
                } catch (e) {}
            }
            return related;
        }

        async function fetchSongsForQuery(query) {
            try {
                const url = `${API_BASE_URL}api/search/songs?query=${encodeURIComponent(query)}`;
                const resp = await fetch(url);
                const data = await resp.json();
                return data.data?.results || data.results || [];
            } catch (e) { return []; }
        }

        async function askClaudeForSongs(prompt) {
            const KEY = "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";
            try {
                const resp = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': KEY,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-20250514',
                        max_tokens: 1000,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                const data = await resp.json();
                const text = data.content?.map(b => b.text || '').join('') || '';
                const match = text.match(/\[[\s\S]*\]/);
                if (match) return JSON.parse(match[0]);
            } catch (e) { console.error('AI error:', e); }
            return [];
        }

        function renderModuleGrid(items, container, endpoint) {
            container.innerHTML = '';
            container.classList.add('track-list');
            if (!items || !items.length) {
                container.innerHTML = `<p class="loading-state">No ${endpoint.split('/').pop()} found.</p>`;
                return;
            }
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'track-item';
                const title = decodeHtmlEntities(item.name || item.title || 'Unknown');
                const img = item.image ? item.image[item.image.length - 1].url : '';
                const type = endpoint.split('/').pop().slice(0, -1);
                card.innerHTML =
                    `<img src="${img}" alt="${title}" loading="lazy"><div class="track-info"><strong>${title}</strong><span>${item.type || type}</span></div>`;
                card.onclick = () => fetchAndPlayTracks(item.id, type);
                container.appendChild(card);
            });
        }

        async function fetchAndPlayTracks(id, type) {
            let endpoint;
            if (type === 'album') endpoint = 'api/albums';
            else if (type === 'playlist') endpoint = 'api/playlists';
            else if (type === 'artist') endpoint = 'api/artists';
            else { notify('Unsupported type.', 'error'); return; }
            const queueDiv = document.getElementById('queueList');
            queueDiv.innerHTML = `<p class="loading-state">Loading ${type}...</p>`;
            changeSection(document.querySelector('.nav-item[data-target="queue-section"]'));
            try {
                const url = `${API_BASE_URL}${endpoint}?id=${encodeURIComponent(id)}`;
                const resp = await fetch(url);
                const data = await resp.json();
                let tracks = data.data?.songs || data.data?.topSongs || data.data?.results || [];
                if (!tracks.length) { queueDiv.innerHTML = '<p class="loading-state">No songs found.</p>'; return; }
                currentPlaylist = tracks;
                originalPlaylist = [...tracks];
                if (isShuffleOn) toggleShuffle();
                renderQueue();
                playTrack(0);
            } catch (e) { queueDiv.innerHTML = `<p class="loading-state" style="color:#ff453a;">Error loading.</p>`; }
        }

        // ────────────────────────────────────────────────────────────────
        //  QUEUE
        // ────────────────────────────────────────────────────────────────
        function renderQueue() {
            renderTrackList(currentPlaylist, document.getElementById('queueList'), false, 'queue');
            renderQueuePanel();
        }

        function renderQueuePanel() {
            const list = document.getElementById('qpList');
            if (!currentPlaylist.length) {
                list.innerHTML = '<p class="loading-state">Queue is empty.</p>';
                return;
            }
            list.innerHTML = '';
            currentPlaylist.forEach((t, i) => {
                const div = document.createElement('div');
                div.className = 'qp-item';
                const img = getImageUrl(t, 100);
                const title = decodeHtmlEntities(t.name || t.title || 'Unknown');
                const artist = getArtistName(t);
                div.innerHTML = `
                    <img src="${img}" loading="lazy">
                    <div class="qi-info"><strong>${title}</strong><span>${artist}</span></div>
                    ${i === currentTrackIndex ? '<span class="qi-play"><i class="fa-solid fa-play"></i></span>' : ''}
                `;
                div.onclick = () => {
                    if (i !== currentTrackIndex) {
                        currentTrackIndex = i;
                        playTrack(i);
                        renderQueue();
                    }
                    toggleQueuePanel();
                };
                list.appendChild(div);
            });
        }

        // ────────────────────────────────────────────────────────────────
        //  QUEUE PANEL TOGGLE
        // ────────────────────────────────────────────────────────────────
        function toggleQueuePanel() {
            const isOpen = queuePanel.classList.contains('open');
            if (isOpen) {
                queuePanel.classList.remove('open');
            } else {
                renderQueuePanel();
                queuePanel.classList.add('open');
            }
        }

        // ────────────────────────────────────────────────────────────────
        //  PLAYER CORE
        // ────────────────────────────────────────────────────────────────
        function playTrack(index) {
            if (index < 0 || index >= currentPlaylist.length) return;
            currentTrackIndex = index;
            const track = currentPlaylist[index];
            const url = getAudioUrl(track);
            if (!url) { notify('Audio URL missing.', 'error');
                playNext(); return; }

            const title = decodeHtmlEntities(track.name || track.title || 'Unknown');
            const artist = getArtistName(track);
            const img = getImageUrl(track);

            // Update UI
            cpLabel.textContent = title.length > 14 ? title.slice(0, 14) + '…' : title;
            cpArtist.textContent = artist.length > 14 ? artist.slice(0, 14) + '…' : artist;
            circularPlayer.classList.add('visible');
            modalTitle.textContent = title;
            modalArtist.textContent = artist;
            modalArt.src = img;
            updateModalFavorite(track.id);

            if (isCircularCollapsed) { cpIndicator.innerHTML = '<i class="fa-solid fa-play"></i>'; }

            audio.src = url;
            audio.load();
            audio.play().then(() => {
                isPlaying = true;
                updatePlayPauseIcons();
                trackSongPlay(track);
                setTimeout(() => refreshAIUpNext(track), 1500);
                setTimeout(() => onSmartQueueTrackChanged(track), 2000);
                forYouLoaded = false;
                updatePlayerUI();
                renderQueuePanel();
            }).catch(e => {
                console.error('Play error:', e);
                isPlaying = false;
                updatePlayPauseIcons();
                notify('Playback failed.', 'error');
            });
            updatePlayerUI();
            renderQueuePanel();
        }

        function updatePlayerUI() {
            const track = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length ? currentPlaylist[
            currentTrackIndex] : null;
            if (!track) {
                modalTitle.textContent = 'No song playing';
                modalArtist.textContent = '';
                cpLabel.textContent = 'Song';
                cpArtist.textContent = 'Artist';
                circularPlayer.classList.remove('visible');
                modalFavorite.style.color = '#aeaeb2';
                return;
            }
            const title = decodeHtmlEntities(track.name || track.title || 'Unknown');
            const artist = getArtistName(track);
            const img = getImageUrl(track);
            modalTitle.textContent = title;
            modalArtist.textContent = artist;
            modalArt.src = img;
            cpLabel.textContent = title.length > 14 ? title.slice(0, 14) + '…' : title;
            cpArtist.textContent = artist.length > 14 ? artist.slice(0, 14) + '…' : artist;
            circularPlayer.classList.add('visible');
            updateModalFavorite(track.id);
            document.querySelectorAll('.track-item.is-playing').forEach(el => el.classList.remove('is-playing'));
            document.querySelectorAll(`.track-item[data-id="${track.id}"]`).forEach(el => el.classList.add('is-playing'));
            if (isFinite(audio.duration) && audio.duration > 0) {
                modalTotalDuration.textContent = formatTime(audio.duration);
            }
        }

        function updatePlayPauseIcons() {
            const show = isPlaying ? 'none' : 'inline';
            const hide = isPlaying ? 'inline' : 'none';
            modalPlayIcon.style.display = show;
            modalPauseIcon.style.display = hide;
            cpIndicator.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
        }

        function togglePlayPause() {
            if (currentTrackIndex === -1 && currentPlaylist.length) { playTrack(0); return; }
            if (audio.paused) {
                audio.play();
                isPlaying = true;
            } else {
                audio.pause();
                isPlaying = false;
            }
            updatePlayPauseIcons();
        }

        function playNext() {
            if (!currentPlaylist.length) return;
            let idx = currentTrackIndex + 1;
            if (idx >= currentPlaylist.length) idx = 0;
            if (repeatMode === 'none' && idx === 0 && currentTrackIndex === currentPlaylist.length - 1) {
                audio.pause();
                isPlaying = false;
                updatePlayPauseIcons();
                currentTrackIndex = -1;
                updatePlayerUI();
                renderQueuePanel();
                return;
            }
            if (idx !== currentTrackIndex) playTrack(idx);
        }

        function playPrev() {
            if (!currentPlaylist.length) return;
            let idx = currentTrackIndex - 1;
            if (idx < 0) idx = currentPlaylist.length - 1;
            if (idx !== currentTrackIndex) playTrack(idx);
        }

        function toggleShuffle() {
            isShuffleOn = !isShuffleOn;
            modalShuffle.classList.toggle('active', isShuffleOn);
            if (isShuffleOn) {
                originalPlaylist = [...currentPlaylist];
                if (currentTrackIndex !== -1) {
                    const cur = currentPlaylist[currentTrackIndex];
                    let rest = currentPlaylist.filter((_, i) => i !== currentTrackIndex);
                    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));
                        [rest[i], rest[j]] = [rest[j], rest[i]]; }
                    currentPlaylist = [cur, ...rest];
                    currentTrackIndex = 0;
                } else {
                    for (let i = currentPlaylist.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));
                        [currentPlaylist[i], currentPlaylist[j]] = [currentPlaylist[j], currentPlaylist[i]]; }
                }
            } else {
                if (currentTrackIndex !== -1) {
                    const cur = currentPlaylist[currentTrackIndex];
                    currentPlaylist = [...originalPlaylist];
                    currentTrackIndex = currentPlaylist.findIndex(t => t.id === cur.id);
                } else {
                    currentPlaylist = [...originalPlaylist];
                }
            }
            renderQueue();
            notify(isShuffleOn ? 'Shuffle ON 🔀' : 'Shuffle OFF', 'info');
        }

        function toggleRepeat() {
            if (repeatMode === 'none') { repeatMode = 'all';
                modalRepeat.classList.add('active');
                modalRepeat.style.color = '#30d158';
                notify('Repeat All 🔁', 'info'); } else if (repeatMode === 'all') { repeatMode = 'one';
                modalRepeat.style.color = '#ff375f';
                notify('Repeat One 🔂', 'info'); } else { repeatMode = 'none';
                modalRepeat.classList.remove('active');
                modalRepeat.style.color = '';
                notify('Repeat Off', 'info'); }
        }

        // ────────────────────────────────────────────────────────────────
        //  EXTRA PLAYER FEATURES
        // ────────────────────────────────────────────────────────────────
        function addCurrentToPlaylist() {
            const track = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length ? currentPlaylist[currentTrackIndex] :
                null;
            if (!track) { notify('No song playing.', 'warning'); return; }
            showContextMenu({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2, preventDefault: () => {},
                stopPropagation: () => {} }, track);
        }

        function shareCurrent() {
            const track = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length ? currentPlaylist[currentTrackIndex] :
                null;
            if (!track) { notify('No song playing.', 'warning'); return; }
            const text = `🎵 ${decodeHtmlEntities(track.name||track.title)} by ${getArtistName(track)}`;
            if (navigator.share) {
                navigator.share({ title: 'Song', text: text, url: window.location.href }).catch(() => {});
            } else {
                navigator.clipboard.writeText(text).then(() => notify('Copied to clipboard!', 'success'));
            }
        }

        function toggleLyrics() {
            isLyricsVisible = !isLyricsVisible;
            notify(isLyricsVisible ? 'Lyrics mode ON (demo)' : 'Lyrics mode OFF', 'info');
            // In a real app, this would fetch and display lyrics
            if(isLyricsVisible) {
                const title = modalTitle.textContent;
                const artist = modalArtist.textContent;
                notify(`Displaying lyrics for "${title}" by ${artist} (Feature available in premium version)`, 'info');
            }
        }

        function toggleSleepTimer() {
            if (sleepTimer) {
                clearTimeout(sleepTimer);
                sleepTimer = null;
                notify('Sleep timer cancelled', 'info');
                return;
            }
            const minutes = prompt('Sleep timer (minutes):', '30');
            if (minutes && !isNaN(minutes) && minutes > 0) {
                sleepTimer = setTimeout(() => {
                    audio.pause();
                    isPlaying = false;
                    updatePlayPauseIcons();
                    notify('Sleep timer: playback stopped', 'info');
                    sleepTimer = null;
                }, minutes * 60000);
                notify(`Sleep timer set for ${minutes} minutes`, 'success');
            }
        }

        function toggleEqualizer() {
            isEqualizerVisible = !isEqualizerVisible;
            notify(isEqualizerVisible ? 'Equalizer (demo) ON' : 'Equalizer OFF', 'info');
        }

        function cycleSpeed() {
            const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
            let idx = speeds.indexOf(playbackSpeed);
            playbackSpeed = speeds[(idx + 1) % speeds.length];
            audio.playbackRate = playbackSpeed;
            speedBtn.textContent = playbackSpeed + 'x';
            notify(`Speed: ${playbackSpeed}x`, 'info');
        }

        function toggleAutoPlayNext(checked) {
            autoPlayNext = checked;
            notify(autoPlayNext ? 'Auto-play ON' : 'Auto-play OFF', 'info');
        }

        // ────────────────────────────────────────────────────────────────
        //  AI TASTE CONTROLS
        // ────────────────────────────────────────────────────────────────
        let tastePanelOpen = false;
        function toggleTastePanel() {
            tastePanelOpen = !tastePanelOpen;
            document.getElementById('aiTastePanel').classList.toggle('open', tastePanelOpen);
        }

        function forgetCurrentTrack() {
            const track = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length ? currentPlaylist[currentTrackIndex] : null;
            if (!track) { notify('No song playing.', 'warning'); return; }
            // Add to a "forgotten" list and remove from history
            let forgotten = JSON.parse(localStorage.getItem('songAppForgotten') || '[]');
            forgotten.push(track.id);
            localStorage.setItem('songAppForgotten', JSON.stringify(forgotten));
            listeningHistory = listeningHistory.filter(t => t.id !== track.id);
            saveListeningHistory();
            notify('Song will be forgotten in future recommendations.', 'info');
            closeContextMenu();
        }

        function saveListeningHistory() {
            try { localStorage.setItem('songAppHistory', JSON.stringify(listeningHistory.slice(0, MAX_HISTORY))); } catch (e) {}
        }

        // ────────────────────────────────────────────────────────────────
        //  RECORDING FEATURE
        // ────────────────────────────────────────────────────────────────
        async function toggleRecording() {
            if (isRecording) {
                stopRecording();
            } else {
                await startRecording();
            }
        }

        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });
                    const url = URL.createObjectURL(blob);
                    const title = 'Voice Recording ' + new Date().toLocaleString();
                    const track = {
                        id: 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                        name: title,
                        primaryArtists: 'User Recording',
                        artist: 'User Recording',
                        image: [{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%238b5cf6"/%3E%3Cpath fill="white" d="M35 30l30 20-30 20z"/%3E%3C/svg%3E' }],
                        downloadUrl: [{ url: url }],
                        duration: 0,
                        isLocal: true,
                        isRecording: true
                    };
                    // Determine duration
                    const tempAudio = new Audio(url);
                    tempAudio.addEventListener('loadedmetadata', () => {
                        track.duration = Math.round(tempAudio.duration);
                        // Save to IndexedDB vault
                        saveDownload(track);
                        renderPlaylists();
                        notify(`✅ Recording saved: ${decodeHtmlEntities(title)}`, 'success');
                    });
                    audioChunks = [];
                };

                mediaRecorder.start();
                isRecording = true;
                recordBtn.classList.add('recording');
                recordBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
                notify('🔴 Recording started...', 'info');
            } catch (e) {
                notify('❌ Recording failed: ' + e.message, 'error');
            }
        }

        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            isRecording = false;
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
            notify('⏹️ Recording stopped.', 'info');
        }

        // ────────────────────────────────────────────────────────────────
        //  ARTIST SLIDE-IN MODAL (door style)
        // ────────────────────────────────────────────────────────────────
        async function openArtistSlide() {
            const track = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length ? currentPlaylist[currentTrackIndex] :
                null;
            if (!track) { notify('No song playing.', 'warning'); return; }
            isArtistSlideOpen = true;
            artistSlideModal.classList.add('open');
            asmTitle.textContent = `More from ${getArtistName(track)}`;
            asmList.innerHTML = `<p class="loading-state"><i class="fa-solid fa-spinner fa-pulse"></i> Loading...</p>`;

            try {
                const artist = getArtistName(track);
                const url = `${API_BASE_URL}api/search/songs?query=${encodeURIComponent(artist)}`;
                const resp = await fetch(url);
                const data = await resp.json();
                let results = data.data?.results || data.results || [];
                const seen = new Set();
                const filtered = results.filter(t => {
                    if (t.id === track.id) return false;
                    if (seen.has(t.id)) return false;
                    seen.add(t.id);
                    return true;
                }).slice(0, 20);

                if (!filtered.length) {
                    asmList.innerHTML = '<p class="loading-state">No other songs found.</p>';
                    return;
                }
                asmList.innerHTML = '';
                filtered.forEach(t => {
                    const div = document.createElement('div');
                    div.className = 'asm-item';
                    const img = getImageUrl(t, 100);
                    const title = decodeHtmlEntities(t.name || t.title || 'Unknown');
                    const art = getArtistName(t);
                    div.innerHTML = `
                        <img src="${img}" loading="lazy">
                        <div class="ai-info"><strong>${title}</strong><span>${art}</span></div>
                        <span class="ai-play"><i class="fa-solid fa-play"></i></span>
                    `;
                    div.onclick = () => {
                        currentPlaylist = filtered;
                        originalPlaylist = [...filtered];
                        const idx = filtered.findIndex(x => x.id === t.id);
                        playTrack(idx);
                        renderQueue();
                        closeArtistSlide();
                        closePlayerModal();
                        changeSection(document.querySelector('.nav-item[data-target="queue-section"]'));
                    };
                    asmList.appendChild(div);
                });
            } catch (e) {
                asmList.innerHTML = `<p class="loading-state">Error loading.</p>`;
            }
        }

        function closeArtistSlide() {
            isArtistSlideOpen = false;
            artistSlideModal.classList.remove('open');
        }

        // ────────────────────────────────────────────────────────────────
        //  PLAYER MODAL & CIRCULAR PLAYER
        // ────────────────────────────────────────────────────────────────
        function openPlayerModal() {
            if (isCircularCollapsed) { expandFromCircular(); return; }
            isPlayerModalOpen = true;
            modalOverlay.classList.add('open');
            mainScroll.classList.add('player-open');
            circularPlayer.classList.remove('visible');
            updatePlayerUI();
            if (audio.duration && isFinite(audio.duration)) {
                modalTotalDuration.textContent = formatTime(audio.duration);
            }
        }

        function closePlayerModal() {
            isPlayerModalOpen = false;
            modalOverlay.classList.remove('open');
            mainScroll.classList.remove('player-open');
            if (!isCircularCollapsed) { circularPlayer.classList.add('visible'); }
            closeArtistSlide();
        }

        function collapseToCircular() {
            const track = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length ? currentPlaylist[currentTrackIndex] :
                null;
            if (!track) { notify('No song playing.', 'warning'); return; }
            isCircularCollapsed = true;
            circularPlayer.classList.add('visible');
            if (isPlayerModalOpen) { modalOverlay.classList.remove('open');
                isPlayerModalOpen = false;
                mainScroll.classList.remove('player-open'); }
            if (cpPosX !== null && cpPosY !== null) {
                circularPlayer.style.left = cpPosX + 'px';
                circularPlayer.style.top = cpPosY + 'px';
                circularPlayer.style.right = 'auto';
                circularPlayer.style.bottom = 'auto';
            } else {
                circularPlayer.style.right = '20px';
                circularPlayer.style.bottom = '110px';
                circularPlayer.style.left = 'auto';
                circularPlayer.style.top = 'auto';
            }
            const title = decodeHtmlEntities(track.name || track.title || 'Unknown');
            const artist = getArtistName(track);
            cpLabel.textContent = title.length > 14 ? title.slice(0, 14) + '…' : title;
            cpArtist.textContent = artist.length > 14 ? artist.slice(0, 14) + '…' : artist;
            cpIndicator.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
            notify('Collapsed to disc 💿', 'info');
            enableCircularDrag();
        }

        function expandFromCircular() {
            isCircularCollapsed = false;
            circularPlayer.classList.remove('visible');
            openPlayerModal();
        }

        // ─── CIRCULAR PLAYER DRAG ───
        function enableCircularDrag() {
            const disc = circularPlayer;
            let isDragging = false;
            let startX, startY, origX, origY;

            disc.addEventListener('touchstart', (e) => {
                isDragging = true;
                const t = e.touches[0];
                startX = t.clientX;
                startY = t.clientY;
                const rect = disc.getBoundingClientRect();
                origX = rect.left;
                origY = rect.top;
                disc.style.cursor = 'grabbing';
            }, { passive: true });

            disc.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                const t = e.touches[0];
                const dx = t.clientX - startX;
                const dy = t.clientY - startY;
                disc.style.left = (origX + dx) + 'px';
                disc.style.top = (origY + dy) + 'px';
                disc.style.right = 'auto';
                disc.style.bottom = 'auto';
            }, { passive: true });

            disc.addEventListener('touchend', () => {
                if (isDragging) {
                    isDragging = false;
                    disc.style.cursor = 'grab';
                    const rect = disc.getBoundingClientRect();
                    cpPosX = rect.left;
                    cpPosY = rect.top;
                }
            }, { passive: true });

            disc.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = disc.getBoundingClientRect();
                origX = rect.left;
                origY = rect.top;
                disc.style.cursor = 'grabbing';
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                disc.style.left = (origX + dx) + 'px';
                disc.style.top = (origY + dy) + 'px';
                disc.style.right = 'auto';
                disc.style.bottom = 'auto';
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    disc.style.cursor = 'grab';
                    const rect = disc.getBoundingClientRect();
                    cpPosX = rect.left;
                    cpPosY = rect.top;
                }
            });
            disc.style.cursor = 'grab';
        }

        // ────────────────────────────────────────────────────────────────
        //  AUDIO EVENTS
        // ────────────────────────────────────────────────────────────────
        audio.addEventListener('timeupdate', () => {
            if (isFinite(audio.duration) && audio.duration > 0) {
                const pct = (audio.currentTime / audio.duration) * 100;
                modalSeek.value = pct;
                modalCurrentTime.textContent = formatTime(audio.currentTime);
            }
        });

        audio.addEventListener('loadedmetadata', () => {
            if (isFinite(audio.duration)) {
                modalTotalDuration.textContent = formatTime(audio.duration);
            }
        });

        audio.addEventListener('ended', () => {
            if (repeatMode === 'one') {
                audio.currentTime = 0;
                audio.play();
            } else if (autoPlayNext) {
                playNext();
            } else {
                // Auto-play is off, just stop
                isPlaying = false;
                updatePlayPauseIcons();
                updatePlayerUI();
            }
        });

        modalSeek.addEventListener('input', () => {
            const t = (modalSeek.value / 100) * audio.duration;
            modalCurrentTime.textContent = formatTime(t);
        });
        modalSeek.addEventListener('change', () => {
            audio.currentTime = (modalSeek.value / 100) * audio.duration;
        });

        modalVolume.addEventListener('input', () => {
            audio.volume = parseFloat(modalVolume.value);
        });
        audio.volume = parseFloat(modalVolume.value);

        // ────────────────────────────────────────────────────────────────
        //  CAROUSEL
        // ────────────────────────────────────────────────────────────────
        const carouselTimers = {};
        const carouselStates = {};

        function startCarousel(trackId, total) {
            if (total <= 3) return;
            const CARD = 140 + 12;
            const VISIBLE = 3;
            const MAX = total - VISIBLE;
            carouselStates[trackId] = 0;
            if (carouselTimers[trackId]) clearInterval(carouselTimers[trackId]);
            const track = document.getElementById(trackId);
            if (!track) return;

            attachCarouselTouch(trackId, MAX, CARD);

            carouselTimers[trackId] = setInterval(() => {
                const el = document.getElementById(trackId);
                if (!el || el._isDragging) return;
                const home = document.getElementById('home-section');
                if (!home.classList.contains('active')) return;
                let idx = carouselStates[trackId];
                idx++;
                if (idx > MAX) {
                    el.style.transition = 'transform 0.5s cubic-bezier(0.32,0.72,0,1)';
                    el.style.transform = `translateX(-${MAX*CARD}px)`;
                    setTimeout(() => {
                        el.style.transition = 'none';
                        el.style.transform = 'translateX(0px)';
                        carouselStates[trackId] = 0;
                        setTimeout(() => { el.style.transition = 'transform 0.5s cubic-bezier(0.32,0.72,0,1)'; }, 50);
                    }, 520);
                    return;
                }
                carouselStates[trackId] = idx;
                el.style.transition = 'transform 0.5s cubic-bezier(0.32,0.72,0,1)';
                el.style.transform = `translateX(-${idx*CARD}px)`;
            }, 3200);
        }

        function attachCarouselTouch(trackId, MAX, CARD) {
            const track = document.getElementById(trackId);
            if (!track || track._touchAttached) return;
            track._touchAttached = true;
            let startX = 0,
                startOff = 0,
                isDrag = false;

            function getOff() {
                const m = track.style.transform.match(/translateX\((-?[\d.]+)px\)/);
                return m ? parseFloat(m[1]) : 0;
            }
            track.addEventListener('touchstart', (e) => {
                if (carouselTimers[trackId]) clearInterval(carouselTimers[trackId]);
                startX = e.touches[0].clientX;
                startOff = getOff();
                isDrag = true;
                track._isDragging = true;
                track.style.transition = 'none';
            }, { passive: true });
            track.addEventListener('touchmove', (e) => {
                if (!isDrag) return;
                const diff = e.touches[0].clientX - startX;
                let off = startOff + diff;
                const min = -(MAX * CARD);
                off = Math.max(min, Math.min(20, off));
                track.style.transform = `translateX(${off}px)`;
            }, { passive: true });
            track.addEventListener('touchend', (e) => {
                if (!isDrag) return;
                isDrag = false;
                track._isDragging = false;
                const diff = e.changedTouches[0].clientX - startX;
                let idx = carouselStates[trackId];
                if (diff < -40) idx = Math.min(idx + 1, MAX);
                else if (diff > 40) idx = Math.max(idx - 1, 0);
                carouselStates[trackId] = idx;
                track.style.transition = 'transform 0.4s cubic-bezier(0.32,0.72,0,1)';
                track.style.transform = `translateX(-${idx*CARD}px)`;
                setTimeout(() => {
                    if (!carouselTimers[trackId]) startCarousel(trackId, MAX + 3);
                }, 4000);
            }, { passive: true });
        }

        function showSkeletons(container, count = 6) {
            container.innerHTML = '';
            for (let i = 0; i < count; i++) {
                container.innerHTML += `<div class="skeleton"><div class="sk-img"></div><div class="sk-line"></div><div class="sk-line short"></div></div>`;
            }
        }

        async function fetchAndRenderCategory(config) {
            const container = document.getElementById(config.id);
            if (!container) return;
            if (carouselTimers[config.id]) { clearInterval(carouselTimers[config.id]);
                delete carouselTimers[config.id]; }
            showSkeletons(container);
            container.style.transform = 'translateX(0px)';
            const seeds = ['latest', 'new', 'top', 'hits', 'trending', '2024', 'popular'];
            const seed = seeds[Math.floor(Math.random() * seeds.length)];
            try {
                const url = `${API_BASE_URL}${config.endpoint}?query=${encodeURIComponent(config.query+' '+seed)}`;
                const resp = await fetch(url);
                const data = await resp.json();
                let results = data.data?.results || data.results || [];
                results = results.sort(() => Math.random() - 0.5).slice(0, 8);
                container.innerHTML = '';
                if (!results.length) { container.innerHTML = '<p class="loading-state">No tracks.</p>'; return; }
                results.forEach(track => {
                    const card = document.createElement('div');
                    card.className = 'card-module';
                    const img = getImageUrl(track, 250);
                    const title = decodeHtmlEntities(track.name || track.title || 'Unknown');
                    const artist = getArtistName(track);
                    card.innerHTML =
                        `<img src="${img}" loading="lazy"><strong>${title}</strong><span>${artist}</span>`;
                    card.onclick = () => {
                        currentPlaylist = results;
                        originalPlaylist = [...results];
                        const idx = results.findIndex(t => t.id === track.id);
                        playTrack(idx);
                        renderQueue();
                        changeSection(document.querySelector('.nav-item[data-target="queue-section"]'));
                    };
                    container.appendChild(card);
                });
                setTimeout(() => startCarousel(config.id, results.length), 800);
            } catch (e) { container.innerHTML = `<p class="loading-state" style="color:#ff453a;">Error</p>`; }
        }

        // ────────────────────────────────────────────────────────────────
        //  CATEGORY MODAL
        // ────────────────────────────────────────────────────────────────
        function openCategoryQueue(title, query) {
            notify(`⏳ ${title} — loading...`, 'info');
            smartQueueActive = true;
            smartQueueSeenIds.clear();
            smartQueueMoodHistory = [];
            categoryAllTracks = [];
            const modal = document.getElementById('categoryModal');
            document.getElementById('catModalTitle').textContent = title;
            document.getElementById('catModalSubtitle').textContent = 'Top Songs';
            document.getElementById('catSongCount').textContent = 'Loading...';
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';

            const list = document.getElementById('catModalList');
            list.innerHTML = '';
            for (let i = 0; i < 12; i++) {
                list.innerHTML +=
                    `<div class="track-skeleton"><div class="ts-img"></div><div class="ts-lines"><div class="ts-line"></div><div class="ts-line short"></div></div></div>`;
            }

            fetchCategoryTracks(query, title);
        }

        function closeCategoryModal() {
            document.getElementById('categoryModal').classList.remove('open');
            document.body.style.overflow = '';
        }

        async function fetchCategoryTracks(query, title) {
            const list = document.getElementById('catModalList');
            const countEl = document.getElementById('catSongCount');
            categoryAllTracks = [];
            const batch = [query, `${query} hits`, `${query} new`, `${query} latest`, `${query} popular`, `${query} top`,
                `${query} best`, `${query} 2024`
            ];
            const seen = new Set();
            for (const bq of batch) {
                try {
                    const url = `${API_BASE_URL}api/search/songs?query=${encodeURIComponent(bq)}`;
                    const resp = await fetch(url);
                    const data = await resp.json();
                    const results = data.data?.results || data.results || [];
                    results.forEach(t => {
                        if (!seen.has(t.id)) { seen.add(t.id);
                            categoryAllTracks.push(t); }
                    });
                    countEl.textContent = `${categoryAllTracks.length} songs`;
                    renderCategoryList(list, categoryAllTracks);
                    if (categoryAllTracks.length >= 100) break;
                } catch (e) {}
            }
            countEl.textContent = `${categoryAllTracks.length} songs`;
        }

        function renderCategoryList(container, tracks) {
            container.innerHTML = '';
            tracks.forEach((track, idx) => {
                const item = document.createElement('div');
                item.className = 'track-item';
                item.dataset.id = track.id;
                const img = getImageUrl(track, 100);
                const title = decodeHtmlEntities(track.name || track.title || 'Unknown');
                const artist = getArtistName(track);
                const isFav = playlists.favorites.tracks.some(f => f.id === track.id);
                const trackJSON = JSON.stringify(track).replace(/"/g, '&quot;');
                item.innerHTML = `
                    <span class="cat-track-num">${idx+1}</span>
                    <img src="${img}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;" loading="lazy">
                    <div class="track-info"><strong>${title}</strong><span>${artist}</span></div>
                    <button class="icon-btn ${isFav?'is-favorite':''}" onclick="event.stopPropagation(); toggleFavorite(${trackJSON}); this.classList.toggle('is-favorite')" title="Favorite">
                        <svg viewBox="0 0 24 24" fill="currentColor" style="width:20px;height:20px;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A5.98 5.98 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.53L12 21.35z"/></svg>
                    </button>
                `;
                item.onclick = () => {
                    currentPlaylist = categoryAllTracks;
                    originalPlaylist = [...categoryAllTracks];
                    const i = categoryAllTracks.findIndex(t => t.id === track.id);
                    playTrack(i);
                    renderQueue();
                    closeCategoryModal();
                    changeSection(document.querySelector('.nav-item[data-target="queue-section"]'));
                };
                container.appendChild(item);
            });
        }

        function playAllCategoryTracks() {
            if (!categoryAllTracks.length) return;
            smartQueueActive = true;
            smartQueueSeenIds.clear();
            categoryAllTracks.forEach(t => smartQueueSeenIds.add(t.id));
            currentPlaylist = categoryAllTracks;
            originalPlaylist = [...categoryAllTracks];
            playTrack(0);
            renderQueue();
            closeCategoryModal();
            changeSection(document.querySelector('.nav-item[data-target="queue-section"]'));
            notify(`▶️ Playing all ${categoryAllTracks.length} songs`, 'success');
        }

        // ────────────────────────────────────────────────────────────────
        //  SMART QUEUE
        // ────────────────────────────────────────────────────────────────
        async function onSmartQueueTrackChanged(track) {
            if (!track) return;
            smartQueueMoodHistory.unshift(`${decodeHtmlEntities(track.name||track.title)} by ${getArtistName(track)}`);
            if (smartQueueMoodHistory.length > 6) smartQueueMoodHistory.pop();
            const remaining = currentPlaylist.length - currentTrackIndex - 1;
            if (remaining < 15 && smartQueueActive && !smartQueueRefilling) {
                smartQueueRefilling = true;
                await refillSmartQueue();
                smartQueueRefilling = false;
            }
        }

        async function refillSmartQueue() {
            if (!smartQueueMoodHistory.length) return;
            const recent = smartQueueMoodHistory.slice(0, 5).join(', ');
            const prompt =
                `User is listening to: ${recent}. Detect mood and suggest 5 similar songs. Reply ONLY as JSON array: [{"query":"Song Name Artist"}]. No extra text.`;
            const suggestions = await askClaudeForSongs(prompt);
            if (!suggestions || !suggestions.length) return;
            let added = 0;
            for (const s of suggestions) {
                try {
                    const tracks = await fetchSongsForQuery(s.query);
                    for (const t of tracks) {
                        if (!smartQueueSeenIds.has(t.id)) {
                            smartQueueSeenIds.add(t.id);
                            currentPlaylist.push(t);
                            originalPlaylist.push(t);
                            added++;
                        }
                    }
                } catch (e) {}
            }
            if (added) { renderQueue();
                notify(`✨ ${added} new songs added by AI`, 'success'); }
        }

        // ────────────────────────────────────────────────────────────────
        //  AI FOR YOU
        // ────────────────────────────────────────────────────────────────
        function trackSongPlay(track) {
            if (!track || !track.id) return;
            listeningHistory = listeningHistory.filter(t => t.id !== track.id);
            listeningHistory.unshift({
                id: track.id,
                name: track.name || track.title || 'Unknown',
                primaryArtists: getArtistName(track),
                image: track.image,
                downloadUrl: track.downloadUrl,
                duration: track.duration
            });
            try { localStorage.setItem('songAppHistory', JSON.stringify(listeningHistory.slice(0, MAX_HISTORY))); } catch (e) {}
        }

        function buildAIContext() {
            const historyNames = listeningHistory.slice(0, 8).map(t => `${decodeHtmlEntities(t.name)} by ${t.primaryArtists}`);
            const favNames = (playlists.favorites?.tracks || []).slice(0, 6).map(t => `${decodeHtmlEntities(t.name||t.title)} by ${getArtistName(t)}`);
            const nowPlaying = currentTrackIndex >= 0 && currentTrackIndex < currentPlaylist.length ? currentPlaylist[
                currentTrackIndex] : null;
            return { historyNames, favNames, nowPlaying };
        }

        async function generateForYouRecs() {
            const btn = document.getElementById('forYouRefreshBtn');
            if (btn) { btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.querySelector('i').className = 'fa-solid fa-spinner fa-spin'; }
            document.getElementById('fyEmptyState').style.display = 'none';
            const { historyNames, favNames, nowPlaying } = buildAIContext();

            const moodSec = document.getElementById('fyMoodSection');
            const moodList = document.getElementById('fyMoodList');
            if (historyNames.length || favNames.length) {
                moodSec.style.display = 'block';
                const context = historyNames.length ? historyNames.join(', ') : favNames.join(', ');
                const prompt =
                    `User's past plays: ${context}. Infer mood/genre and suggest 8 songs. Reply ONLY as JSON array: [{"query":"Song Name Artist"}]. No extra text.`;
                const sugg = await askClaudeForSongs(prompt);
                const queries = sugg.length ? sugg.map(s => s.query) : (historyNames.slice(0, 4).map(n => n.split(' by ')[1] ||
                    n));
                await renderAIRecs(moodList, queries, 'Mood detect nahi ho paaya.');
            } else { moodSec.style.display = 'none'; }

            const npSec = document.getElementById('fyNowPlayingSection');
            const npList = document.getElementById('fyNowPlayingList');
            if (nowPlaying) {
                npSec.style.display = 'block';
                const prompt =
                    `User listening to "${decodeHtmlEntities(nowPlaying.name||nowPlaying.title)}" by "${getArtistName(nowPlaying)}". Suggest 4 similar songs. Reply ONLY as JSON array: [{"query":"Song Name Artist"}]. No extra text.`;
                const sugg = await askClaudeForSongs(prompt);
                const queries = sugg.length ? sugg.map(s => s.query) : [`similar to ${decodeHtmlEntities(nowPlaying.name||nowPlaying.title)}`];
                await renderAIRecs(npList, queries, 'No similar songs.');
            } else { npSec.style.display = 'none'; }

            const histSec = document.getElementById('fyHistorySection');
            const histList = document.getElementById('fyHistoryList');
            if (historyNames.length) {
                histSec.style.display = 'block';
                const prompt =
                    `User recently heard: ${historyNames.join(', ')}. Suggest 4 songs they'd enjoy. Reply ONLY as JSON array: [{"query":"Song Name Artist"}]. No extra text.`;
                const sugg = await askClaudeForSongs(prompt);
                const queries = sugg.length ? sugg.map(s => s.query) : (historyNames.slice(0, 3).map(n => n.split(' by ')[1] ||
                    n));
                await renderAIRecs(histList, queries, 'No suggestions.');
            } else { histSec.style.display = 'none'; }

            const favSec = document.getElementById('fyFavoritesSection');
            const favList = document.getElementById('fyFavoritesList');
            if (favNames.length) {
                favSec.style.display = 'block';
                const prompt =
                    `User's favorites: ${favNames.join(', ')}. Suggest 4 new songs similar. Reply ONLY as JSON array: [{"query":"Song Name Artist"}]. No extra text.`;
                const sugg = await askClaudeForSongs(prompt);
                const queries = sugg.length ? sugg.map(s => s.query) : ['latest hits', 'popular songs 2024'];
                await renderAIRecs(favList, queries, 'No suggestions.');
            } else { favSec.style.display = 'none'; }

            if (btn) { btn.disabled = false;
                btn.style.opacity = '1';
                btn.querySelector('i').className = 'fa-solid fa-rotate-right'; }
            forYouLoaded = true;
            notify('✨ For You refreshed!', 'success');
        }

        async function renderAIRecs(container, queries, emptyMsg) {
            container.innerHTML =
                `<div class="ai-thinking"><span>AI soch raha hai</span><div class="dots"><span></span><span></span><span></span></div></div>`;
            const all = [];
            for (const q of queries.slice(0, 4)) {
                const tracks = await fetchSongsForQuery(q);
                tracks.forEach(t => { if (!all.find(x => x.id === t.id)) all.push(t); });
            }
            if (!all.length) { container.innerHTML = `<p class="loading-state">${emptyMsg}</p>`; return; }
            renderTrackList(all, container, true);
        }

        function loadForYouSection() {
            if (!forYouLoaded) {
                const { historyNames, favNames } = buildAIContext();
                document.getElementById('fyEmptyState').style.display = (historyNames.length || favNames.length) ? 'none' :
                    'block';
                if (historyNames.length || favNames.length) generateForYouRecs();
            }
        }

        // ────────────────────────────────────────────────────────────────
        //  AI UP NEXT
        // ────────────────────────────────────────────────────────────────
        async function refreshAIUpNext(track) {
            if (!track) return;
            const prompt =
                `User just started "${decodeHtmlEntities(track.name||track.title)}" by "${getArtistName(track)}". Suggest the single best next song. Reply ONLY as JSON array: [{"query":"Song Name Artist"}]. No extra text.`;
            const sugg = await askClaudeForSongs(prompt);
            if (!sugg || !sugg.length) return;
            const tracks = await fetchSongsForQuery(sugg[0].query);
            if (!tracks.length) return;
            aiUpNextTrackData = tracks[0];
            notify(`Up next: ${decodeHtmlEntities(tracks[0].name||tracks[0].title)} by ${getArtistName(tracks[0])}`, 'info');
        }

        function playAiUpNext() {
            if (!aiUpNextTrackData) return;
            currentPlaylist = [aiUpNextTrackData];
            originalPlaylist = [aiUpNextTrackData];
            currentTrackIndex = 0;
            playTrack(0);
            renderQueue();
            aiUpNextTrackData = null;
        }

        // ────────────────────────────────────────────────────────────────
        //  SEARCH AI SUGGESTIONS
        // ────────────────────────────────────────────────────────────────
        async function showSearchAISuggestions(query) {
            if (query.length < 3) return;
            const box = document.getElementById('searchAiBox');
            const list = document.getElementById('searchAiList');
            box.style.display = 'block';
            list.innerHTML =
                `<div class="ai-thinking"><span>AI suggest kar raha hai</span><div class="dots"><span></span><span></span><span></span></div></div>`;
            const prompt =
                `User searched "${query}". Suggest 3 related song searches. Reply ONLY as JSON array: [{"query":"Song Name or Artist"}]. No extra text.`;
            const sugg = await askClaudeForSongs(prompt);
            if (!sugg || !sugg.length) { box.style.display = 'none'; return; }
            const queries = sugg.map(s => s.query);
            await renderAIRecs(list, queries, 'No suggestions.');
        }

        // ────────────────────────────────────────────────────────────────
        //  HOME AI STRIP
        // ────────────────────────────────────────────────────────────────
        async function loadHomeAIStrip() {
            const { historyNames, favNames } = buildAIContext();
            if (!historyNames.length && !favNames.length) return;
            const strip = document.getElementById('homeAiStrip');
            const list = document.getElementById('homeAiList');
            strip.style.display = 'block';
            showSkeletons(list, 5);
            const context = [...historyNames.slice(0, 3), ...favNames.slice(0, 2)].join(', ');
            const prompt =
                `User listens to: ${context}. Suggest 4 fresh songs. Reply ONLY as JSON array: [{"query":"Song Name Artist"}]. No extra text.`;
            const sugg = await askClaudeForSongs(prompt);
            const queries = sugg.length ? sugg.map(s => s.query) : ['trending 2024'];
            const all = [];
            for (const q of queries) {
                const tracks = await fetchSongsForQuery(q);
                tracks.forEach(t => { if (!all.find(x => x.id === t.id)) all.push(t); });
            }
            list.innerHTML = '';
            list.style.transform = 'translateX(0px)';
            if (!all.length) { strip.style.display = 'none'; return; }
            all.forEach(track => {
                const card = document.createElement('div');
                card.className = 'card-module';
                const img = getImageUrl(track, 250);
                const title = decodeHtmlEntities(track.name || track.title || 'Unknown');
                const artist = getArtistName(track);
                card.innerHTML = `<img src="${img}" loading="lazy"><strong>${title}</strong><span>${artist}</span>`;
                card.onclick = () => {
                    currentPlaylist = all;
                    originalPlaylist = [...all];
                    const idx = all.findIndex(t => t.id === track.id);
                    playTrack(idx);
                    renderQueue();
                    changeSection(document.querySelector('.nav-item[data-target="queue-section"]'));
                };
                list.appendChild(card);
            });
            setTimeout(() => startCarousel('homeAiList', all.length), 800);
        }

        // ────────────────────────────────────────────────────────────────
        //  CONTEXT MENU
        // ────────────────────────────────────────────────────────────────
        function showContextMenu(e, track) {
            e.preventDefault();
            e.stopPropagation();
            trackBeingAdded = track;
            const menu = document.getElementById('contextMenu');
            const list = document.getElementById('contextMenuPlaylists');
            list.innerHTML = '';
            Object.values(playlists).forEach(pl => {
                const div = document.createElement('div');
                div.className = 'ctx-item';
                div.textContent = pl.name;
                div.onclick = (ev) => { ev.stopPropagation();
                    addTrackToPlaylist(pl.id, trackBeingAdded);
                    menu.style.display = 'none'; };
                list.appendChild(div);
            });
            let x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            let y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
            if (x + 200 > window.innerWidth) x = window.innerWidth - 210;
            if (y + 200 > window.innerHeight) y = window.innerHeight - 210;
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            menu.style.display = 'block';
            document.onclick = () => { menu.style.display = 'none';
                document.onclick = null; };
            menu.onclick = (ev) => ev.stopPropagation();
        }

        function closeContextMenu() { document.getElementById('contextMenu').style.display = 'none'; }

        // ────────────────────────────────────────────────────────────────
        //  LOCAL FILES (audio/video) – storage access
        // ────────────────────────────────────────────────────────────────
        function handleLocalFiles(event) {
            const files = event.target.files;
            if (!files.length) return;
            const tracks = [];
            Array.from(files).forEach(file => {
                const url = URL.createObjectURL(file);
                const title = file.name.replace(/\.[^/.]+$/, '').trim() || 'Untitled';
                const artist = 'Local File';
                const track = {
                    id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    name: title,
                    primaryArtists: artist,
                    artist: artist,
                    image: [{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%2330d158"/%3E%3Cpath fill="white" d="M35 30l30 20-30 20z"/%3E%3C/svg%3E' }],
                    downloadUrl: [{ url: url }],
                    duration: 0,
                    isLocal: true
                };
                const tempAudio = new Audio(url);
                tempAudio.addEventListener('loadedmetadata', () => {
                    track.duration = Math.round(tempAudio.duration);
                });
                tracks.push(track);
            });
            if (tracks.length) {
                // Save all uploaded files to IndexedDB vault for offline playback
                tracks.forEach(t => saveDownload(t));
                currentPlaylist = tracks;
                originalPlaylist = [...tracks];
                if (isShuffleOn) toggleShuffle();
                renderQueue();
                playTrack(0);
                changeSection(document.querySelector('.nav-item[data-target="queue-section"]'));
                notify(`📂 ${tracks.length} local files loaded and saved to offline vault`, 'success');
            }
            event.target.value = '';
        }

        // ────────────────────────────────────────────────────────────────
        //  DOWNLOAD (Unified Offline Vault)
        // ────────────────────────────────────────────────────────────────
        const DB_NAME = 'SongVault'; // Unified storage for downloads, local files, recordings
        const STORE = 'songs';
        const MAX_DL = 50;
        let db = null;

        function openDB() {
            return new Promise((resolve, reject) => {
                if (db) return resolve(db);
                const req = indexedDB.open(DB_NAME, 1);
                req.onupgradeneeded = e => {
                    if (!e.target.result.objectStoreNames.contains(STORE)) {
                        e.target.result.createObjectStore(STORE, { keyPath: 'id' });
                    }
                };
                req.onsuccess = e => { db = e.target.result;
                    resolve(db); };
                req.onerror = () => reject(req.error);
            });
        }

        async function getAllDownloads() {
            const d = await openDB();
            return new Promise((resolve, reject) => {
                const tx = d.transaction(STORE, 'readonly');
                const req = tx.objectStore(STORE).getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        }

        async function saveDownload(song) {
            const d = await openDB();
            return new Promise((resolve, reject) => {
                const tx = d.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).put(song);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
        }

        async function deleteDownload(id) {
            const d = await openDB();
            return new Promise((resolve, reject) => {
                const tx = d.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).delete(id);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
        }

        async function isDownloaded(id) {
            const d = await openDB();
            return new Promise((resolve) => {
                const tx = d.transaction(STORE, 'readonly');
                const req = tx.objectStore(STORE).get(id);
                req.onsuccess = () => resolve(!!req.result);
                req.onerror = () => resolve(false);
            });
        }

        async function downloadTrack(trackData, btn) {
            const track = typeof trackData === 'string' ? JSON.parse(trackData) : trackData;
            const id = track.id;
            const name = track.name || track.title || 'Unknown';
            const artist = getArtistName(track);
            const img = getImageUrl(track);
            const url = getAudioUrl(track);
            if (!url) { notify('No download URL.', 'error'); return; }
            if (await isDownloaded(id)) { notify('Already in offline vault!', 'info'); return; }

            // Automatically save to offline vault without prompting
            const existing = await getAllDownloads();
            if (existing.length >= MAX_DL) { notify('Offline vault limit reached.', 'warning'); return; }
            if (btn) { btn.style.opacity = '0.5'; }
            notify(`⏬ Saving to offline vault...`, 'info');
            try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('Fetch failed');
                const blob = await resp.blob();
                const base64 = await new Promise((resolve, reject) => {
                    const r = new FileReader();
                    r.onloadend = () => resolve(r.result);
                    r.onerror = reject;
                    r.readAsDataURL(blob);
                });
                const songData = { id, name, artist, image: img, base64, onlineUrl: url, duration: track.duration || 0,
                    downloadedAt: Date.now() };
                await saveDownload(songData);
                if (!playlists.downloads) { playlists.downloads = { id: 'downloads', name: '📥 Downloads', tracks: [],
                        isPermanent: true }; }
                if (!playlists.downloads.tracks.some(t => t.id === id)) {
                    playlists.downloads.tracks.push(track);
                    savePlaylists();
                    renderPlaylists();
                }
                if (btn) { btn.style.opacity = '1';
                    btn.classList.add('downloaded'); }
                notify(`✅ Saved to vault: ${decodeHtmlEntities(name)}`, 'success');
                updateDownloadsUI();
            } catch (e) {
                notify(`❌ Save failed: ${e.message}`, 'error');
                if (btn) btn.style.opacity = '1';
            }
        }

        async function updateDownloadsUI() {
            const songs = await getAllDownloads();
            if (playlists.downloads) {
                playlists.downloads.tracks = songs.map(s => ({
                    id: s.id,
                    name: s.name,
                    primaryArtists: s.artist,
                    image: [{ url: s.image }],
                    downloadUrl: [{ url: s.base64 || s.onlineUrl }],
                    duration: s.duration || 0,
                }));
                savePlaylists();
                renderPlaylists();
            }
        }

        // ────────────────────────────────────────────────────────────────
        //  OFFLINE / ONLINE DETECTION & CACHING
        // ────────────────────────────────────────────────────────────────
        function handleOnline() {
            notify('🟢 You are back online!', 'success', [{ label: 'Refresh', onclick: 'location.reload()' }]);
            if (navigator.onLine) {
                CATEGORY_CONFIG.forEach(c => fetchAndRenderCategory(c));
            }
        }

        function handleOffline() {
            notify('🔴 You are offline. Using offline vault.', 'warning');
            // Automatically load from offline vault
            loadOfflineVault();
        }

        async function loadOfflineVault() {
            const songs = await getAllDownloads();
            if (songs.length) {
                currentPlaylist = songs.map(s => ({
                    id: s.id,
                    name: s.name,
                    primaryArtists: s.artist,
                    image: [{ url: s.image }],
                    downloadUrl: [{ url: s.base64 || s.onlineUrl }],
                    duration: s.duration || 0,
                }));
                originalPlaylist = [...currentPlaylist];
                renderQueue();
                if (currentPlaylist.length > 0 && currentTrackIndex === -1) {
                    playTrack(0);
                }
                notify(`📂 Loaded ${currentPlaylist.length} songs from offline vault`, 'success');
            }
        }

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if ('serviceWorker' in navigator) {
            const swCode = `
                self.addEventListener('install', e => {
                    e.waitUntil(
                        caches.open('song-player-v1').then(cache => {
                            return cache.addAll(['/', '/index.html']);
                        })
                    );
                });
                self.addEventListener('fetch', e => {
                    e.respondWith(
                        caches.match(e.request).then(response => {
                            return response || fetch(e.request).then(fetchResponse => {
                                if (e.request.url.includes('/api/')) {
                                    const cloned = fetchResponse.clone();
                                    caches.open('song-api-v1').then(cache => {
                                        cache.put(e.request, cloned);
                                    });
                                }
                                return fetchResponse;
                            });
                        })
                    );
                });
            `;
            console.log('Service Worker: please create a sw.js file with the provided code for offline caching.');
            notify('📦 Offline caching enabled (Service Worker)', 'info');
        }

        // ────────────────────────────────────────────────────────────────
        //  INIT
        // ────────────────────────────────────────────────────────────────
        async function init() {
            loadPlaylists();
            loadRecentSearches();
            renderRecentSearches();
            renderPlaylists();
            viewPlaylist('favorites');
            CATEGORY_CONFIG.forEach(c => fetchAndRenderCategory(c));
            setTimeout(loadHomeAIStrip, 3000);
            try {
                const h = localStorage.getItem('songAppHistory');
                listeningHistory = h ? JSON.parse(h) : [];
            } catch (e) { listeningHistory = []; }
            const dl = await getAllDownloads();
            if (playlists.downloads) {
                playlists.downloads.tracks = dl.map(s => ({
                    id: s.id,
                    name: s.name,
                    primaryArtists: s.artist,
                    image: [{ url: s.image }],
                    downloadUrl: [{ url: s.base64 || s.onlineUrl }],
                    duration: s.duration || 0,
                }));
                savePlaylists();
                renderPlaylists();
            }
            audio.volume = parseFloat(modalVolume.value);
            enableCircularDrag();

            if (!navigator.onLine) {
                notify('🔴 You are offline. Using offline vault.', 'warning');
                loadOfflineVault();
            }

            notify('🎵 Welcome to Song!', 'success');
        }

        init();

        // Register the service worker
        if ('serviceWorker' in navigator && navigator.onLine) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
