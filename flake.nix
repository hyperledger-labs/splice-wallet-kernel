{
  description = "Splice Wallet Kernel";

  inputs = {
    nixpkgs.url = "nixpkgs/b97cce1538cc03ffe511dbcbf0ec8fe0f2c8a269";
    flake-utils.url = "github:numtide/flake-utils/11707dc2f618dd54ca8739b309ec4fc024de578b";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem
      (system:
        let
          pkgs = import nixpkgs { inherit system; overlays = import ./nix/overlays.nix; config = { allowUnfree = true; }; };
        in
        {
          devShells.default = import ./nix/shell.nix { inherit pkgs; ci = false; };
          devShells.ci = import ./nix/shell.nix { inherit pkgs; ci = true; };
        }
      );
}
