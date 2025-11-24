{ pkgs, ... }: {
  # قناة nixpkgs
  channel = "unstable";

  # الباكجات المثبتة في البيئة
  packages = [
    pkgs.nodejs_22
    pkgs.pnpm
    جدحاتن٨٧٦٥  ض٤٥ظذ
    \
    =-ح٠مزومخ٩ه٨ع
    extensions = [
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
      "eamodio.gitlens"
      "humao.rest-client"
      "mongodb.mongodb-vscode"
    ];
    
    # أوامر تشغيل المشروع
    workspace = {
      # استخدام pnpm للتثبيت
      onLoad = "pnpm install --no-frozen-lockfile";
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
