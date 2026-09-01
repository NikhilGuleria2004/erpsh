.PHONY: install lint typecheck build test smoke clean

# Install dependencies for both projects in parallel.
install:
	cd Backend && npm install
	cd Frontend && npm install

# Lint both projects. Use `make -j2 lint` to actually run in parallel.
lint:
	cd Backend && npm run lint
	cd Frontend && npm run lint

# Typecheck both projects.
typecheck:
	cd Backend && npx tsc --noEmit
	cd Frontend && npx tsc --noEmit

# Production build of both projects.
build:
	cd Backend && npm run build
	cd Frontend && npm run build

# Convenience: lint + typecheck + build in one shot.
check: lint typecheck build

# Run the smoke test against a local backend on :8787.
smoke:
	cd Backend && npm run smoke

# Wipe build artifacts.
clean:
	rm -rf Backend/dist Frontend/.next
