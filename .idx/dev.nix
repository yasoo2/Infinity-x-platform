{ pkgs, ... }: {
  # قناة nixpkgs
  channel = "unstable";

  # الباكجات المثبتة في البيئة
  packages = [
    pkgs.nodejs_22
    pkgs.pnpm
    pkgs.nodePackages.npm
    pkgs.nodePackages.nodemon
    pkgs.nodePackages.concurrently
    pkgs.nodePackages.prettier
    pkgs.nodePackages.eslint
    pkgs.openssl
  ];

  # متغيرات البيئة
  env = {
    GEMINI_API_KEY = ""; # استبدل هذا بمفتاحك الحقيقي
    # تعطيل التحقق الصارم من lockfile في بيئة التطوير لتجنب المشاكل
    NPM_CONFIG_FROZEN_LOCKFILE = "false";
  };
  
  idx = {
    # إضافات VS Code
    extensions = [
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
      "eamodio.gitlens"
      "humao.rest-client"
      "mongodb.mongodb-vscode"
    ];
    
    # أوامر تشغيل المشروع
    workspace = {
      # استخدام pnpm للتثبيت مع --no-frozen-lockfile لضمان التثبيت
      onLoad = "echo 'Installing dependencies...' && pnpm install --no-frozen-lockfile";
      start = {
        command = "npm run dev";
        notification = {
          onSuccess = "Development servers are running. Access the frontend on port 5173 and the backend on 4000.";
        };
      };
    };

    # المعاينة
    previews = [
      {
        id = "frontend-dashboard";
        name = "Application Dashboard";
        port = 5173;
        manager = "web";
        command = ["npm" "run" "dev:frontend"];
      }
    ];
  };
}
