# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  # Switched to unstable to get Node.js v22 as required by your package.json
  channel = "unstable";

  # Use https://search.nixos.org/packages to find packages
  packages = [
    # Node.js version required by the project's engines
    pkgs.nodejs_22
    
    # Essential tools for this project's development scripts
    pkgs.nodePackages.npm
    pkgs.nodePackages.nodemon
    pkgs.nodePackages.concurrently

    # Code quality and formatting tools
    pkgs.nodePackages.prettier
    pkgs.nodePackages.eslint
  ];

  # Sets environment variables in the workspace
  env = {};
  
  idx = {
    # Recommended extensions for this project (React, Node.js, MongoDB)
    # You can search for more on https://open-vsx.org/
    extensions = [
      # Linting and code quality
      "dbaeumer.vscode-eslint"
      # Code formatting
      "esbenp.prettier-vscode"
      # Enhanced Git capabilities
      "eamodio.gitlens"
      # API testing directly in the editor
      "humao.rest-client"
      # MongoDB integration
      "mongodb.mongodb-vscode"
    ];
    
    workspace = {
      # Defines commands to run when the workspace is loaded.
      # This will automatically install all npm dependencies for you.
      onLoad = "echo 'Installing dependencies...' && npm install";

      # Defines the default start command. 
      # This runs the 'dev' script from your package.json, starting both backend and frontend.
      start = {
        command = "npm run dev";
        notification = {
          onSuccess = "Development servers are running. Access the frontend on port 5173 and the backend on 4000.";
        };
      };
    };

    # Sets up automatic previews for your running services
    previews = [
      {
        id = "frontend-dashboard";
        name = "Application Dashboard";
        port = 5173; # Default Vite port, listed in your backend's CORS config
        manager = "web";
        # This command starts only the frontend, making it available for preview
        command = ["npm", "run", "dev:frontend"];
      }
    ];
  };
}
