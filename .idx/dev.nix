{ pkgs, ... }: {
  # قناة nixpkgs
  channel = "unstable";

  # الباكجات المثبتة في البيئة
  packages = [
    pkgs.nodejs_22
    pkgs.pnpm
  ];

  # إعدادات مساحة العمل (Workspace)
  workspace = {
    # الإضافات الموصى بها لـ VS Code
    extensions = [
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
      "eamodio.gitlens"
      "humao.rest-client"
      "mongodb.mongodb-vscode"
    ];
    
    # استخدام pnpm للتثبيت عند تحميل البيئة
    onLoad = "pnpm install --no-frozen-lockfile";

    # أمر بدء تشغيل المشروع
    start = {
      # استخدام pnpm بدلاً من npm للاتساق
      command = "pnpm run dev";
      notification = {
        onSuccess = "Development servers are running. Access the frontend on port 5173 and the backend on 4000.";
      };
    };
  };
}
