{ pkgs, ci }:
let
  inherit (pkgs) stdenv;

  # NOTE: please keep these lists sorted for an easy overview and to avoid merge noise.
  requiredPackages = with pkgs; ([
    # packages required for both CI and local development
    nodejs
  ] ++ (if ci then [
    # packages for CI only
  ] else [
    # packages for local-development only
  ]));
in
pkgs.mkShell {
  packages = requiredPackages;
}
