{ pkgs }:
pkgs.mkShell {
  packages = with pkgs; [
    nodejs
  ];
}
