#This works only in Linux right now.
./run.sh

while true; do
inotifywait -e modify,create,delete -r . && ./build.sh && ./run.sh
done
