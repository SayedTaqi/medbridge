# Termux / proot follow-up

Do not use `pkg` inside the current `test@localhost` shell. That shell is the
host/container environment, not the Termux package-manager environment.

The previous test established:

- proot binary exists at:
  `$HOME/local-proot/root/usr/bin/proot`
- Debian rootfs exists at:
  `$HOME/local-proot/debian/debian-trixie-aarch64`
- Debian `/bin/bash` exists and resolves through the rootfs.
- `/bin/true` under proot exits with status 182.
- proot verbose output shows the translated ELF loader is being started but
  the guest process exits with 182.

Therefore the next debugging step should inspect the guest ELF loader and
syscall/seccomp behavior, not reinstall `proot` with `pkg`.

Run from the host shell:

```sh
ROOT="$HOME/local-proot/debian/debian-trixie-aarch64"
PROOT="$HOME/local-proot/root/usr/bin/proot"

"$PROOT" --version

file "$ROOT/bin/bash" "$ROOT/lib/ld-linux-aarch64.so.1"
readelf -l "$ROOT/bin/bash" | grep -E 'interpreter|GNU_STACK' || true
readelf -l "$ROOT/bin/true" | grep -E 'interpreter|GNU_STACK' || true

"$PROOT" -0 -r "$ROOT" -b /dev -b /proc -b /sys -b /storage:/storage \
  /bin/sh -c 'uname -a; id; pwd; /bin/true; echo true_status=$?'
```

Do not change the Android/Termux installation until these results are known.
