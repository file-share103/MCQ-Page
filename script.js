// Update refresh time
function updateRefreshTime() {
    const now = new Date();
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('refresh-time').textContent = now.toLocaleDateString('en-US', options);
}

// Load all folders from the repository
async function loadFolders() {
    const foldersContainer = document.getElementById('folders-container');
    const loadingIndicator = foldersContainer.querySelector('.loading');

    try {
        // GitHub API URL for the repository root contents
        const apiUrl = 'https://api.github.com/repos/file-share103/MCQ-s-Data/contents/';

        console.log(`Fetching repository contents from: ${apiUrl}`);

        // Add a timeout to handle API request failures
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), 15000)
        );

        // Race the fetch against a timeout
        const response = await Promise.race([
            fetch(apiUrl),
            timeoutPromise
        ]);

        if (!response.ok) {
            // Provide more specific error messages based on status code
            if (response.status === 404) {
                throw new Error('Repository not found. Please check the repository path.');
            } else if (response.status === 403) {
                throw new Error('API rate limit exceeded. Please try again later.');
            } else {
                throw new Error(`Failed to fetch repository contents: ${response.status} ${response.statusText}`);
            }
        }

        const data = await response.json();

        // Filter for directories only
        const directories = data.filter(item => item.type === 'dir');

        // Clear loading indicator
        loadingIndicator.classList.remove('active');

        if (directories.length === 0) {
            foldersContainer.innerHTML = '<p>No folders found in the repository</p>';
            return;
        }

        // Clear the container
        foldersContainer.innerHTML = '';

        // Create folder elements for each directory
        directories.forEach((dir, index) => {
            const folderElement = document.createElement('div');
            folderElement.className = 'folder';

            // Format the folder name for better display
            let displayName = dir.name;
            // Replace underscores and hyphens with spaces
            displayName = displayName.replace(/[_-]/g, ' ');
            // Capitalize first letter of each word
            displayName = displayName.split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');

            folderElement.innerHTML = `
                <div class="folder-title" data-folder="${dir.name}">
                    <span>${displayName}</span>
                    <span class="toggle">+</span>
                </div>
                <div class="folder-content" id="${dir.name.replace(/\s+/g, '-').toLowerCase()}-content">
                    <!-- PDF files will be loaded here -->
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Loading files...</p>
                    </div>
                </div>
            `;

            foldersContainer.appendChild(folderElement);

            // Add click event listener to the folder title
            const folderTitle = folderElement.querySelector('.folder-title');
            folderTitle.addEventListener('click', function() {
                const content = this.nextElementSibling;
                content.classList.toggle('active');
                this.querySelector('.toggle').textContent = content.classList.contains('active') ? '-' : '+';

                // Load content if it's the first time opening
                if (content.classList.contains('active') && content.querySelectorAll('.pdf-item').length === 0) {
                    const folderId = this.getAttribute('data-folder');
                    loadPDFList(folderId, content);
                }
            });

            // Automatically open the first folder
            if (index === 0) {
                setTimeout(() => folderTitle.click(), 500);
            }
        });

    } catch (error) {
        console.error('Error loading folders:', error);
        loadingIndicator.classList.remove('active');

        // Provide a user-friendly error message
        foldersContainer.innerHTML = `
            <div class="error-container">
                <p>Error loading folders: ${error.message}</p>
                <button class="retry-button">Retry</button>
            </div>
        `;

        // Add event listener to retry button
        const retryButton = foldersContainer.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', function() {
                foldersContainer.innerHTML = `
                    <div class="loading active">
                        <div class="spinner"></div>
                        <p>Loading folders...</p>
                    </div>
                `;

                // Try loading the folders again
                setTimeout(loadFolders, 500);
            });
        }
    }
}

// Update refresh time when page loads and load folders
document.addEventListener('DOMContentLoaded', function() {
    updateRefreshTime();

    // Load all folders from the repository
    loadFolders();
});

// Note: Folder toggle functionality is now handled in the loadFolders function

// Load PDF list from GitHub
async function loadPDFList(folderId, container) {
    const loadingIndicator = container.querySelector('.loading');
    loadingIndicator.classList.add('active');

    try {
        // GitHub API URL for the repository contents
        // Encode the folder ID to handle spaces and special characters
        const encodedFolderId = encodeURIComponent(folderId);
        const apiUrl = `https://api.github.com/repos/file-share103/MCQ-s-Data/contents/${encodedFolderId}`;

        console.log(`Fetching files from: ${apiUrl}`);

        // Add a timeout to handle API request failures
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), 15000)
        );

        // Race the fetch against a timeout
        const response = await Promise.race([
            fetch(apiUrl),
            timeoutPromise
        ]);

        if (!response.ok) {
            // Provide more specific error messages based on status code
            if (response.status === 404) {
                throw new Error('Folder not found. Please check the folder path.');
            } else if (response.status === 403) {
                throw new Error('API rate limit exceeded. Please try again later.');
            } else {
                throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
            }
        }

        const data = await response.json();

        // Filter for PDF files
        const pdfFiles = data.filter(file =>
            file.name.toLowerCase().endsWith('.pdf') ||
            file.name.toLowerCase().endsWith('.ppt') ||
            file.name.toLowerCase().endsWith('.pptx')
        );

        // Clear loading indicator
        loadingIndicator.classList.remove('active');

        if (pdfFiles.length === 0) {
            container.innerHTML = '<p>No PDF files found</p>';
            return;
        }
        
        // Create PDF items
        pdfFiles.forEach(file => {
            const pdfItem = document.createElement('div');
            pdfItem.className = 'pdf-item';

            // Format the filename for better display
            let displayName = file.name;
            // Remove file extension for cleaner display
            displayName = displayName.replace(/\.pdf$/i, '');
            // Replace underscores and hyphens with spaces
            displayName = displayName.replace(/[_-]/g, ' ');
            // Capitalize first letter of each word
            displayName = displayName.split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');

            pdfItem.textContent = displayName;
            pdfItem.setAttribute('data-url', file.download_url);
            pdfItem.setAttribute('title', file.name); // Add tooltip with full filename

            pdfItem.addEventListener('click', function() {
                // Remove active class from all items
                document.querySelectorAll('.pdf-item').forEach(item => {
                    item.classList.remove('active');
                });

                // Add active class to clicked item
                this.classList.add('active');

                // Update PDF viewer
                loadPDF(this.getAttribute('data-url'), this.textContent);

                // On mobile, hide sidebar after selection to maximize viewing area
                if (window.innerWidth < 768) {
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar) {
                        sidebar.classList.add('hidden');

                        // Update toggle button state
                        const sidebarToggle = document.getElementById('sidebar-toggle');
                        if (sidebarToggle) {
                            sidebarToggle.classList.remove('active');
                            const spans = sidebarToggle.querySelectorAll('span');
                            spans[0].style.transform = 'none';
                            spans[1].style.opacity = '1';
                            spans[2].style.transform = 'none';
                        }
                    }
                }
            });

            container.appendChild(pdfItem);
        });
    } catch (error) {
        console.error('Error loading PDF list:', error);
        loadingIndicator.classList.remove('active');

        // Provide a more user-friendly error message
        let errorMessage = error.message;

        // Add a retry button to allow users to try again
        container.innerHTML = `
            <div class="error-container">
                <p>Error loading files: ${errorMessage}</p>
                <button class="retry-button">Retry</button>
            </div>
        `;

        // Add event listener to retry button
        const retryButton = container.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', function() {
                // Clear the error message
                container.innerHTML = `
                    <div class="loading active">
                        <div class="spinner"></div>
                        <p>Loading files...</p>
                    </div>
                `;

                // Try loading the files again
                setTimeout(() => loadPDFList(folderId, container), 500);
            });
        }
    }
}

// Load PDF in the viewer
function loadPDF(url, title) {
    const pdfFrame = document.getElementById('pdf-frame');
    const pdfTitle = document.querySelector('.pdf-title');
    const loadingIndicator = document.getElementById('pdf-loading');

    // Show loading indicator
    loadingIndicator.classList.add('active');

    // Update title
    pdfTitle.textContent = title;

    // Reset zoom when loading a new PDF
    currentZoom = 100;
    updateZoom();

    // Determine the best viewer based on device
    const isMobile = window.innerWidth < 768;

    // For better reliability, we'll use a direct embed approach with PDF.js
    try {
        // Use PDF.js viewer which works well across devices
        // This is a more reliable approach than Google Docs Viewer
        const pdfJsUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`;

        // Set up load event handler
        pdfFrame.onload = function() {
            loadingIndicator.classList.remove('active');

            // On mobile, hide the sidebar after loading to maximize viewing area
            if (isMobile) {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) {
                    sidebar.classList.add('hidden');
                }

                // For mobile, ensure the iframe takes full height
                pdfFrame.style.height = '100%';
                pdfFrame.parentElement.style.height = '100%';
            }
        };

        // Set up error handler
        pdfFrame.onerror = function() {
            console.error('PDF.js viewer failed, trying Google Docs fallback');
            // Try Google Docs as fallback
            const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
            pdfFrame.src = googleDocsUrl;

            // If Google Docs also fails, try direct embed as last resort
            pdfFrame.onerror = function() {
                console.error('Google Docs viewer failed, trying direct embed');
                pdfFrame.src = url;
            };
        };

        // Load the PDF using PDF.js
        pdfFrame.src = pdfJsUrl;

        // Update loading status with more information
        const loadingStatus = document.getElementById('loading-status');
        if (loadingStatus) {
            loadingStatus.textContent = "Initializing viewer...";
        }

        // Set timeouts to provide status updates and try alternative viewers if needed
        setTimeout(function() {
            if (loadingIndicator.classList.contains('active') && loadingStatus) {
                loadingStatus.textContent = "Still loading... please wait";
            }
        }, 3000); // 3 seconds update

        setTimeout(function() {
            if (loadingIndicator.classList.contains('active')) {
                console.log('PDF loading taking too long, trying alternative viewer');
                if (loadingStatus) {
                    loadingStatus.textContent = "Switching to alternative viewer...";
                }
                // Try Google Docs as an alternative if loading is taking too long
                const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
                pdfFrame.src = googleDocsUrl;

                // Set another timeout for the Google Docs viewer
                setTimeout(function() {
                    if (loadingIndicator.classList.contains('active')) {
                        if (loadingStatus) {
                            loadingStatus.textContent = "Trying direct embed as last resort...";
                        }
                        // If Google Docs is also taking too long, try direct embed
                        pdfFrame.src = url;
                    }
                }, 8000); // 8 more seconds for Google Docs
            }
        }, 8000); // 8 seconds timeout for PDF.js

    } catch (error) {
        console.error('Error loading PDF:', error);

        // Ultimate fallback - try to create a fallback viewer
        createFallbackViewer(url, pdfFrame, loadingIndicator);
    }
}

// Create a fallback viewer when all else fails
function createFallbackViewer(url, pdfFrame, loadingIndicator) {
    // Try to use browser's built-in PDF viewer or a direct embed
    const loadingStatus = document.getElementById('loading-status');
    if (loadingStatus) {
        loadingStatus.textContent = "Using fallback viewer...";
    }

    // Check if we can use object tag instead of iframe for better compatibility
    const iframeContainer = pdfFrame.parentElement;
    if (iframeContainer) {
        // Create an object element as a more reliable fallback
        const objectEl = document.createElement('object');
        objectEl.setAttribute('data', url);
        objectEl.setAttribute('type', 'application/pdf');
        objectEl.setAttribute('width', '100%');
        objectEl.setAttribute('height', '100%');
        objectEl.style.position = 'absolute';
        objectEl.style.top = '0';
        objectEl.style.left = '0';
        objectEl.style.width = '100%';
        objectEl.style.height = '100%';

        // Add fallback message inside the object
        const fallbackMsg = document.createElement('p');
        fallbackMsg.textContent = 'Your browser cannot display this PDF. Please download it instead.';
        objectEl.appendChild(fallbackMsg);

        // Add download link as ultimate fallback
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.textContent = 'Download PDF';
        downloadLink.setAttribute('download', '');
        downloadLink.style.display = 'block';
        downloadLink.style.margin = '20px auto';
        downloadLink.style.textAlign = 'center';
        downloadLink.style.padding = '10px';
        downloadLink.style.backgroundColor = 'var(--accent-color)';
        downloadLink.style.color = 'white';
        downloadLink.style.borderRadius = '4px';
        downloadLink.style.textDecoration = 'none';
        objectEl.appendChild(downloadLink);

        // Replace the iframe with the object element
        iframeContainer.innerHTML = '';
        iframeContainer.appendChild(objectEl);

        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.classList.remove('active');
        }
    } else {
        // If we can't replace with object, use iframe as direct embed
        pdfFrame.onload = function() {
            if (loadingIndicator) {
                loadingIndicator.classList.remove('active');
            }
        };

        pdfFrame.src = url;
    }
}


// Zoom functionality
let currentZoom = 100;
const zoomStep = 10;
const minZoom = 50;
const maxZoom = 200;

document.getElementById('zoom-in').addEventListener('click', function() {
    currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
    updateZoom();
});

document.getElementById('zoom-out').addEventListener('click', function() {
    currentZoom = Math.max(minZoom, currentZoom - zoomStep);
    updateZoom();
});

document.getElementById('zoom-reset').addEventListener('click', function() {
    currentZoom = 100;
    updateZoom();
});

// Fullscreen toggle functionality
document.getElementById('fullscreen-toggle').addEventListener('click', function() {
    toggleFullscreen();
});

// Function to toggle fullscreen mode
function toggleFullscreen() {
    const pdfContainer = document.querySelector('.pdf-container');

    if (!document.fullscreenElement &&
        !document.mozFullScreenElement &&
        !document.webkitFullscreenElement &&
        !document.msFullscreenElement) {
        // Enter fullscreen
        if (pdfContainer.requestFullscreen) {
            pdfContainer.requestFullscreen();
        } else if (pdfContainer.msRequestFullscreen) {
            pdfContainer.msRequestFullscreen();
        } else if (pdfContainer.mozRequestFullScreen) {
            pdfContainer.mozRequestFullScreen();
        } else if (pdfContainer.webkitRequestFullscreen) {
            pdfContainer.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }

        document.getElementById('fullscreen-toggle').innerHTML = '<i>⛶</i>';
        document.getElementById('fullscreen-toggle').title = 'Exit Fullscreen';
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }

        document.getElementById('fullscreen-toggle').innerHTML = '<i>⛶</i>';
        document.getElementById('fullscreen-toggle').title = 'Enter Fullscreen';
    }
}

function updateZoom() {
    const pdfFrame = document.getElementById('pdf-frame');
    const isMobile = window.innerWidth < 768;

    // Different zoom handling for mobile vs desktop
    if (isMobile) {
        // For mobile, we'll use a different approach
        // Instead of scaling the iframe, we'll adjust its size
        pdfFrame.style.transform = 'none'; // Remove transform

        // Make iframe larger based on zoom
        if (currentZoom > 100) {
            const scale = currentZoom / 100;
            pdfFrame.style.width = `${100 * scale}%`;
            pdfFrame.style.height = `${100 * scale}%`;

            // Enable scrolling on container
            const iframeContainer = pdfFrame.parentElement;
            if (iframeContainer) {
                iframeContainer.style.overflow = 'auto';

                // On mobile, add a hint about scrolling if zoomed in significantly
                if (currentZoom >= 150) {
                    showZoomHint();
                }
            }
        } else {
            // Reset to normal size
            pdfFrame.style.width = '100%';
            pdfFrame.style.height = '100%';

            // Disable scrolling if not zoomed
            const iframeContainer = pdfFrame.parentElement;
            if (iframeContainer) {
                iframeContainer.style.overflow = 'hidden';
            }
        }
    } else {
        // Desktop approach - use transform
        pdfFrame.style.transform = `scale(${currentZoom / 100})`;
        pdfFrame.style.transformOrigin = 'top left';

        // Adjust the container to handle the zoomed content
        const iframeContainer = pdfFrame.parentElement;
        if (iframeContainer && iframeContainer.classList.contains('iframe-container')) {
            // When zoomed in, enable scrolling
            if (currentZoom > 100) {
                iframeContainer.style.overflow = 'auto';
                // Set width based on zoom level to ensure proper scrolling
                pdfFrame.style.width = `${currentZoom}%`;
            } else {
                iframeContainer.style.overflow = 'hidden';
                pdfFrame.style.width = '100%';
            }
        }
    }
}

// Function to show a temporary hint about scrolling when zoomed in
function showZoomHint() {
    // Check if hint already exists
    if (document.getElementById('zoom-hint')) return;

    const hint = document.createElement('div');
    hint.id = 'zoom-hint';
    hint.style.position = 'fixed';
    hint.style.bottom = '70px';
    hint.style.left = '50%';
    hint.style.transform = 'translateX(-50%)';
    hint.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    hint.style.color = 'white';
    hint.style.padding = '10px 15px';
    hint.style.borderRadius = '20px';
    hint.style.fontSize = '14px';
    hint.style.zIndex = '1000';
    hint.style.textAlign = 'center';
    hint.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    hint.textContent = 'Scroll to view more of the document';

    document.body.appendChild(hint);

    // Remove the hint after 3 seconds
    setTimeout(() => {
        if (hint.parentNode) {
            hint.parentNode.removeChild(hint);
        }
    }, 3000);
}

// Handle window resize events for responsive behavior
window.addEventListener('resize', function() {
    // Adjust UI elements based on screen size
    const isMobile = window.innerWidth < 768;

    // If we're on mobile and a folder is open, we might want to close it
    // when the user clicks on a PDF to maximize viewing area
    if (isMobile) {
        document.querySelectorAll('.pdf-item').forEach(item => {
            item.addEventListener('click', function() {
                // Find all open folders
                document.querySelectorAll('.folder-content.active').forEach(folder => {
                    // Optional: close folders on mobile after selection
                    // folder.classList.remove('active');
                    // folder.previousElementSibling.querySelector('.toggle').textContent = '+';
                });
            });
        });
    }
});

// Button links
document.getElementById('text1-btn').addEventListener('click', function() {
    window.open('https://example.com', '_blank');
});

document.getElementById('text2-btn').addEventListener('click', function() {
    window.open('https://example.com', '_blank');
});

// Add touch-friendly features for mobile
function addTouchSupport() {
    // Make buttons more touch-friendly
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(button => {
        button.addEventListener('touchstart', function() {
            this.classList.add('touch-active');
        });

        button.addEventListener('touchend', function() {
            this.classList.remove('touch-active');
        });
    });

    // Add swipe detection for mobile if needed
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 100; // Minimum distance for swipe

        if (touchEndX < touchStartX - swipeThreshold) {
            // Swipe left - could be used to hide sidebar on mobile
            const sidebar = document.querySelector('.sidebar');
            if (window.innerWidth < 768 && sidebar) {
                sidebar.classList.add('hidden');
            }
        }

        if (touchEndX > touchStartX + swipeThreshold) {
            // Swipe right - could be used to show sidebar on mobile
            const sidebar = document.querySelector('.sidebar');
            if (window.innerWidth < 768 && sidebar) {
                sidebar.classList.remove('hidden');
            }
        }
    }

    // Setup sidebar toggle for mobile
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle && sidebar) {
        // Initially show sidebar on desktop, hide on mobile
        if (window.innerWidth < 768) {
            sidebar.classList.add('hidden');
            sidebarToggle.classList.remove('active');
            sidebarToggle.querySelector('.toggle-text').textContent = 'Files';
        } else {
            sidebar.classList.remove('hidden');
            sidebarToggle.classList.add('active');
            sidebarToggle.querySelector('.toggle-text').textContent = 'Close';

            // Apply the X icon style
            const spans = sidebarToggle.querySelectorAll('.toggle-icon span');
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(7px, -7px)';
        }

        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('hidden');

            // Animate the toggle button
            const spans = this.querySelectorAll('.toggle-icon span');
            const toggleText = this.querySelector('.toggle-text');
            this.classList.toggle('active');

            if (this.classList.contains('active')) {
                // Change to X icon
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -7px)';
                // Change text to "Close"
                toggleText.textContent = 'Close';
            } else {
                // Change back to hamburger icon
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
                // Change text back to "Files"
                toggleText.textContent = 'Files';
            }

            // If showing sidebar, scroll to top of sidebar
            if (!sidebar.classList.contains('hidden')) {
                sidebar.scrollTop = 0;

                // If any folder is open, make sure it's visible
                const activeFolder = sidebar.querySelector('.folder-content.active');
                if (activeFolder) {
                    setTimeout(() => {
                        activeFolder.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                }
            }
        });
    }
}

// Function to handle orientation changes on mobile
function handleOrientationChange() {
    // Reset zoom when orientation changes
    currentZoom = 100;
    updateZoom();

    // Adjust container heights for the new orientation
    if (window.innerWidth < 768) {
        const pdfContainer = document.querySelector('.pdf-container');
        if (pdfContainer) {
            // Adjust height based on orientation
            if (window.innerWidth > window.innerHeight) {
                // Landscape
                pdfContainer.style.height = '70vh';
                pdfContainer.style.minHeight = '300px';
            } else {
                // Portrait
                pdfContainer.style.height = '60vh';
                pdfContainer.style.minHeight = '350px';
            }
        }
    }
}

// Initialize
updateRefreshTime();
setInterval(updateRefreshTime, 60000); // Update time every minute
addTouchSupport();

// Listen for orientation changes
window.addEventListener('orientationchange', function() {
    // Wait a moment for the browser to complete the orientation change
    setTimeout(handleOrientationChange, 300);
});

// Also listen for resize events which happen on orientation change
window.addEventListener('resize', function() {
    // Use a debounce to prevent multiple calls
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(function() {
        handleOrientationChange();
    }, 300);
});