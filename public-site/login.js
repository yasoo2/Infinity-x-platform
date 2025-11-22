document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent the default form submission

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Basic client-side validation
            if (!username || !password) {
                showError('Please enter both username and password.');
                return;
            }

            try {
                // Send login request to the backend
                const response = await fetch('/login', { // Assuming a /login endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // On successful login, redirect to the dashboard or main app page
                    console.log('Login successful, redirecting...');
                    window.location.href = result.redirectTo || '/dashboard'; // Redirect to dashboard
                } else {
                    // Show error message from the server
                    showError(result.message || 'Invalid username or password.');
                }

            } catch (error) {
                console.error('Login request failed:', error);
                showError('An unexpected error occurred. Please try again later.');
            }
        });
    }

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
    }
});
