#!/bin/bash
# Kiro hook helper: JS syntax check on save (PostFileSave).
# Kiro runs this with the hook event JSON on STDIN (saved file path + session
# context). We extract the saved file path, run `node --check` on it when it
# is a .js file, and always exit 0 so a hook never blocks the session.
set -u
input="$(cat)"
file=""
# Try common field names Kiro may use for the saved file path.
for key in file filePath path uri; do
  v="$(printf '%s' "$input" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const k=process.argv[1];const val=j[k]||(j.file&&j.file[k])||(j.event&&j.event[k]);if(val)process.stdout.write(String(val));}catch(e){}});" "$key" 2>/dev/null)"
  if [ -n "$v" ]; then file="$v"; break; fi
done
# file:// URIs -> plain path
file="${file#file://}"
case "$file" in
  *.js)
    if [ -f "$file" ]; then
      if node --check "$file" 2>/tmp/payphantom-hook-check.err; then
        echo "[hook] node --check OK: $file"
      else
        echo "[hook] SYNTAX ERROR in $file:"
        cat /tmp/payphantom-hook-check.err
      fi
    fi
    ;;
  *) ;;
esac
exit 0
