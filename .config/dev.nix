{ pkgs, ... }: {
  # Enable the Docker daemon
  services.docker.enable = true;

  # Allow the user to connect to the Docker socket
  users.groups.docker.members = [ "user" ];

  # Pre-load the docker-compose package
  packages = [ pkgs.docker-compose ];
}
