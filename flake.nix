{
  description = "OpenSpec - AI-native system for spec-driven development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems f;

      pkgsFor =
        system:
        import nixpkgs {
          inherit system;
          overlays = [ self.overlays.default ];
        };
    in
    {
      overlays.default = final: _prev: {
        openspec = final.stdenv.mkDerivation (finalAttrs: {
          pname = "specagile";
          version = (builtins.fromJSON (builtins.readFile ./package.json)).version;

          src = final.lib.fileset.toSource {
            root = ./.;
            fileset = final.lib.fileset.unions [
              ./src
              ./bin
              ./schemas
              ./scripts
              ./test
              ./package.json
              ./pnpm-lock.yaml
              ./pnpm-workspace.yaml
              ./tsconfig.json
              ./build.js
              ./vitest.config.ts
              ./vitest.setup.ts
              ./eslint.config.js
            ];
          };

          pnpmDeps = final.fetchPnpmDeps {
            inherit (finalAttrs) pname version src;
            pnpm = final.pnpm_10;
            fetcherVersion = 3;
            hash = "sha256-hAsS/Rm7tMN6U2SbKSsZt0bhqS8CurbyRjc8//EQudY=";
          };

          nativeBuildInputs = with final; [
            installShellFiles
            nodejs_22
            npmHooks.npmInstallHook
            pnpmConfigHook
            pnpm_10
          ];

          buildPhase = ''
            runHook preBuild

            pnpm run build

            runHook postBuild
          '';

          dontNpmPrune = true;

          # `specagile completion generate` renders a static command registry, so it
          # needs no project and no network. Opting out of telemetry also disables
          # the update check, keeping the build offline.
          postInstall = final.lib.optionalString (final.stdenv.buildPlatform.canExecute final.stdenv.hostPlatform) ''
            export SPECAGILE_TELEMETRY=0
            completions=$(mktemp -d)
            for shell in bash fish zsh; do
              $out/bin/specagile completion generate "$shell" > "$completions/specagile.$shell"
            done
            installShellCompletion --cmd specagile \
              --bash "$completions/specagile.bash" \
              --fish "$completions/specagile.fish" \
              --zsh "$completions/specagile.zsh"
          '';

          meta = with final.lib; {
            description = "AI-native system for spec-driven development";
            homepage = "https://github.com/dariopalminio/specagile";
            license = licenses.mit;
            maintainers = [ ];
            mainProgram = "specagile";
          };
        });
      };

      packages = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
        in
        {
          default = pkgs.openspec;
          inherit (pkgs) openspec;
        }
      );

      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/specagile";
        };
      });

      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            buildInputs = with pkgs; [
              nodejs_22
              pnpm_10
            ];

            shellHook = ''
              echo "OpenSpec development environment"
              echo "Node version: $(node --version)"
              echo "pnpm version: $(pnpm --version)"
              echo "Run 'pnpm install' to install dependencies"
            '';
          };
        }
      );
    };
}
