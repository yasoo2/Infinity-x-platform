# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "unstable";

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_22,
    pkgs.nodePackages.npm,
    pkgs.nodePackages.nodemon,
    pkgs.nodePackages.concurrently,
    pkgs.nodePackages.prettier,
    pkgs.nodePackages.eslint
  ];

  # Sets environment variables in the workspace
  env = {
    GEMINI_API_KEY = ""; # استبدل هذا بمفتاحك الحقيقي
  };
  
  idx = {
    extensions = [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "eamodio.gitlens",
      "humao.rest-client",
      "mongodb.mongodb-vscode"
    ];
    
    workspace = {
      onLoad = "echo 'Installing dependencies...' && npm install";
      start = {
        command = "npm run dev";
        notification = {
          onSuccess = "Development servers are running. Access the frontend on port 5173 and the backend on 4000.";
        };
      };
    };

    previews = [
      {
        id = "frontend-dashboard";
        name = "Application Dashboard";
        port = 5173;
        manager = "web";
        command = ["npm", "run", "dev:frontend"];
      }
    ];
  };
}
