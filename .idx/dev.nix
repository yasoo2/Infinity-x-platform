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
      "bradlc.vscode-tailwindcss"
      "ms-azuretools.vscode-docker"
      "jnoortheen.nix-ide"
    ];
  };
}
