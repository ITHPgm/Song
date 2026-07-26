# 🎧 # Song — Premium Music Player

**Song** is a completely free, fully-featured web-based music player that works on Android, iOS, and Desktop. It combines streaming, offline storage, voice recording, and AI-powered discovery into one seamless experience. No subscriptions, no limits, just your music.

---

## ✨ Features

### 🎧 Core Playback
- **Stream & Play** – Search and play millions of songs from the built-in API.
- **Queue Management** – Add, remove, reorder, and skip tracks in your queue.
- **Repeat & Shuffle** – Repeat one, repeat all, or shuffle your playlist.
- **Sleep Timer** – Set a timer to automatically stop playback.

### 💾 Offline Vault (IndexedDB)
- **One Unified Storage** – Downloaded songs, uploaded local files (audio/video), and user recordings are all saved in a single offline vault.
- **True Offline Playback** – Play your saved music even without an internet connection.
- **Unlimited Storage** – Store as many songs as your device allows (50+ limit configurable).

### 🎙️ Voice Recording
- **Record Audio** – Tap the microphone icon in the top bar to start recording.
- **Live Visualizer** – A polygraph-style progress bar shows live recording activity.
- **Save to Playlist** – When recording stops, choose an existing playlist or create a new one to save your recording.
- **Always Accessible** – Recordings are saved to the offline vault and are playable anytime.

### 📁 Local Files (Audio/Video)
- **Upload & Play** – Upload any audio or video file using the folder icon.
- **Video-as-Audio** – The app automatically extracts and plays the audio track from video files.
- **Persistent Storage** – All uploaded files are stored in the offline vault for instant replay.

### 🤖 AI-Powered "For You" Section
- **Listening History** – Shows your recently played tracks.
- **Mood Detection** – AI analyzes your listening history to suggest songs that match your mood.
- **Taste Controls** – Use sliders to steer your recommendations (Discovery vs. Familiarity, Acoustic vs. Electronic).
- **"Forget This Song"** – Remove a song from your listening history so it no longer influences recommendations.

### 📋 Playlists
- **Create Custom Playlists** – Organize your music any way you like.
- **Favorites** – Save your favorite songs with a single tap.
- **Downloads** – View all songs saved in your offline vault.
- **Delete Tracks** – Remove songs from any playlist using the stylish yellow/blue delete button.

### 🎨 Player UI
- **Circular Mini Player** – A draggable, floating disc that shows the current song. Features a rotating rainbow border.
- **3D Premium Modal** – The full player uses perspective and 3D transforms for a stunning, immersive experience.
- **Audio Visualizer** – Toggle the visualizer for a dynamic, real-time frequency display.
- **Speed Control** – Adjust playback speed from 0.5x to 2x.

### 📱 PWA (Progressive Web App)
- **Install as an App** – Install Song to your home screen on Android, iOS, or Desktop for a native-like experience.
- **Automatic App Detection** – When installed, the app opens in standalone mode, hiding the browser interface.
- **Offline Caching** – The app shell and API responses are cached for faster loading and offline support.

### 🎮 Retention & Delight Features
- **Tour Guide** – First-time visitors are guided through all major features with an interactive tour.
- **Listening Stats** – Your listening history is tracked and used to generate "For You" recommendations.
- **Recent Searches** – Quickly re-run your recent search queries.
- **Fast & Responsive** – Optimized with `DocumentFragment` batching, debounced searches, and efficient animations for zero lag.

---

## 🚀 How to Use

1. **Open the App** – Visit the hosted URL or open the `index.html` file in your browser.
2. **Install (Optional)** – Tap the download icon in the top bar to install as a PWA.
3. **Search for Music** – Use the Search tab to find songs, albums, or artists.
4. **Play a Song** – Tap any song card or track item. The circular player will appear.
5. **Manage Your Queue** – Open the Queue panel from the "Now Playing" modal or the bottom nav.
6. **Record Audio** – Tap the microphone icon to start recording. Stop and save to a playlist.
7. **Upload Files** – Use the folder icon to upload audio or video files.
8. **Explore For You** – Navigate to the For You section for AI-powered recommendations and your listening history.

---

## 🛠️ Technical Details

- **Built With:** HTML5, CSS3, JavaScript (ES6+)
- **Storage:** IndexedDB (for offline vault) and localStorage (for playlists, history, and settings)
- **API:** [Song1 Beta API](https://song1-beta.vercel.app/) for music search and streaming
- **Service Worker:** Optional `sw.js` for PWA offline caching

---

## 📦 Installation

### To run locally:
1. Download the `index.html` file.
2. Create the following files in the same directory:
   - `manifest.json` (PWA manifest)
   - `sw.js` (Service Worker for offline caching)
3. Open `index.html` in your browser.

### To deploy:
Upload all files to any static hosting service (e.g., Vercel, Netlify, GitHub Pages) and the app will work immediately.

---

## 🧪 Permissions

- **Microphone** – Required for the recording feature.
- **Storage** – Used to save files locally via the browser's IndexedDB.

---

## 🌍 Browser Support

- **Desktop:** Chrome, Edge, Firefox, Safari (latest versions)
- **Mobile:** Android Chrome, iOS Safari (with PWA support)

---

## ❤️ Contributing

This app is open-source and free to use. Feel free to fork, modify, or improve it. If you have suggestions or find bugs, please reach out!

---

## 📄 License

This project is released under the **MIT License**. You are free to use, modify, and distribute it as you wish.

---

## 🎉 Enjoy Your Music!

Thank you for choosing **Song**. Happy listening!

