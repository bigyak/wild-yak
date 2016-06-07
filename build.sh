rm -rf dist
cp -r src dist
find dist/ -name *.js -type f -exec mv {} {}.flow \;
babel src/ -d dist/ "$@" --source-maps
