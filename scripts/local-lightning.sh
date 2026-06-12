# Shell helpers for local regtest Bitcoin and LND commands.
# Source this file from the repository root to use `btc`, `skillsats_ln`, and `payer_ln`.

btc() {
  bitcoin-cli -regtest -datadir="$PWD/.local-lightning/bitcoin" "$@"
}

skillsats_ln() {
  lncli --network=regtest \
    --lnddir="$PWD/.local-lightning/lnd-skillsats" \
    --rpcserver=127.0.0.1:10009 "$@"
}

payer_ln() {
  lncli --network=regtest \
    --lnddir="$PWD/.local-lightning/lnd-payer" \
    --rpcserver=127.0.0.1:10010 "$@"
}
