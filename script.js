// --- Firebase Configuration and Initialization ---
// IMPORTANT: This is your specific project's connection details.
const firebaseConfig = {
    apiKey: "AIzaSyDr3x1IwVQrOgsAZNpWDfnNOrchpa6oB-o",
    authDomain: "combine-project-9f980.firebaseapp.com",
    projectId: "combine-project-9f980",
    storageBucket: "combine-project-9f980.firebasestorage.app",
    messagingSenderId: "727555497020",
    appId: "1:727555497020:web:4bc21ebcd31fb87ceab739",
    measurementId: "G-TN26K5KPJR"
};

// Import Firebase functions from CDN
// For the viewer, we only need to initialize the app, get Firestore,
// and functions for collections, querying, and real-time listening.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js";

// Initialize Firebase app and Firestore database instance
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get a reference to the 'content_items' collection in Firestore.
const contentCollectionRef = collection(db, "content_items");


document.addEventListener('DOMContentLoaded', () => {
    // Select DOM elements (only those relevant to viewer functionality)
    const mobileNav = document.querySelector('.mobile-nav');
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    // Removed elements related to adding/deleting content and the modal for viewer page

    // --- Sidebar Toggle for Mobile ---
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // --- Navigation and Content Switching Logic ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSectionId = e.currentTarget.dataset.section + '-section';
            const targetSectionName = e.currentTarget.dataset.section;

            // Remove 'active' class from all nav items and content sections
            navItems.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));

            // Add 'active' class to clicked nav item
            e.currentTarget.classList.add('active');

            // Show the corresponding content section
            const targetSection = document.getElementById(targetSectionId);
            if (targetSection) {
                targetSection.classList.add('active');
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                }
            }

            // Load content from Firebase for the newly active section
            if (targetSectionName !== 'home') { // Don't try to load content from Firestore for the static home section
                loadContentFirebase(targetSectionName);
            }
        });
    });

    /**
     * Extracts YouTube video ID from various YouTube URL formats.
     * @param {string} url - The full YouTube video URL.
     * @returns {string|null} The YouTube video ID or null if not found.
     */
    function getYouTubeVideoId(url) {
        let videoId = null;
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
        const match = url.match(regex);
        if (match && match[1]) {
            videoId = match[1];
        }
        return videoId;
    }

    /**
     * Loads and displays content for a specific section from Firestore.
     * Uses a real-time listener (onSnapshot) for automatic updates.
     * This version does NOT include delete buttons.
     * @param {string} section - The section name (e.g., 'sermons', 'events').
     */
    function loadContentFirebase(section) {
        const contentContainer = document.getElementById(`${section}-container`);
        if (!contentContainer) {
            console.warn(`Content container for section "${section}" not found.`);
            return;
        }

        // Create a query to get documents from "https://esm.sh/content_items" collection
        // Filter by 'category' to get only relevant items for the current section.
        // For 'orderBy("timestamp", "desc")', you might need to create an index in Firestore.
        // Firebase console will usually give you a link to create it if needed.
        const q = query(
            contentCollectionRef,
            where("category", "==", section),
            // orderBy("timestamp", "desc") // <-- Uncomment this line if you want to order by time (newest first).
                                           // If you uncomment, Firebase console will prompt you to create an index.
        );

        // Set up a real-time listener: onSnapshot
        // This function will be called every time there's a change in the queried data (add, update, delete)
        // so the UI will automatically refresh.
        const unsubscribe = onSnapshot(q, (snapshot) => {
            contentContainer.innerHTML = ''; // Clear existing content before rendering new data

            if (snapshot.empty) {
                contentContainer.innerHTML = '<p class="text-center-message">No content available for this section.</p>';
                return;
            }

            snapshot.forEach(docSnapshot => {
                const item = docSnapshot.data(); // Get the document's data

                const contentItemDiv = document.createElement('div');
                contentItemDiv.classList.add('content-item');

                let mediaContent = '';
                const youtubeId = item.url ? getYouTubeVideoId(item.url) : null;

                if (youtubeId) {
                    // If a YouTube video ID is found, create an iframe for embedding
                    mediaContent = `
                        <div class="video-container">
                            <iframe
                                src="https://www.youtube.com/embed/${youtubeId}?rel=0"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen
                                title="${item.title || 'YouTube video player'}"
                            ></iframe>
                        </div>
                    `;
                } else if (item.url) {
                    // If it's not a YouTube URL but still a URL, provide a standard clickable link
                    mediaContent = `<a href="${item.url}" target="_blank" rel="noopener noreferrer">View Content</a>`;
                }

                // Construct the inner HTML for the content item. No delete button on viewer page.
                contentItemDiv.innerHTML = `
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                    ${mediaContent} <!-- Insert the generated media content (video or link) -->
                `;
                contentContainer.appendChild(contentItemDiv); // Add the new item to the container
            });
        }, (error) => {
            // Error handling for the Firestore listener
            console.error("Error fetching documents from Firestore: ", error);
            contentContainer.innerHTML = '<p class="text-center-message">Error loading content. Please check your internet connection.</p>';
        });

        // IMPORTANT: In a more complex app with many listeners, you would want to store 'unsubscribe'
        // and call it when the component/section is no longer active to prevent memory leaks.
        // For this simple single-page app structure, it's less critical, but good practice.
        // return unsubscribe;
    }

    // --- Initial Page Load ---
    // Simulate clicking the "Home" nav item on page load
    const initialNavItem = document.querySelector('.nav-item[data-section="home"]');
    if (initialNavItem) {
        initialNavItem.click();
    }
});