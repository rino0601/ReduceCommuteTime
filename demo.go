package main

import (
	"net/http"
	"fmt"
	"log"
	"io/ioutil"
)

func main() {
	http.HandleFunc("/", handler)
	log.Fatal(http.ListenAndServe("localhost:8000",nil))
}
func handler(writer http.ResponseWriter, request *http.Request) {
	q := request.URL.Query().Get("q")
	resp, _ := http.Get(q)
	bytes, _ := ioutil.ReadAll(resp.Body)
	resp.Body.Close()
	fmt.Fprintf(writer, "URL.Path = %q\n", request.URL.Path)
	fmt.Fprintf(writer, "URL.Path = %q\n", bytes)
}
