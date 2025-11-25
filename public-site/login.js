document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    if (loginForm) {
        // Toggle password visibility
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', function () {
                // Toggle the type attribute
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                // Toggle the eye icon (using text for simplicity)
                this.textContent = type === 'password' ? '👁️' : '🔒';
            });
        }
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
                const BACKEND_URL = 'https://3000-i9roj998jxo9v00pwj743-c1f3d13e.manus-asia.computer'; // This will be replaced with the actual Render URL in the final deployment
                const response = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
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
                    localStorage.setItem('joe_token', result.token);
                    window.location.href = result.redirectTo || '/dashboard/index.html'; // Redirect to dashboard
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
