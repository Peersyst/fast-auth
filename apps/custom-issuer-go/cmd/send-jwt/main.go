package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type issueRequest struct {
	JWT         string `json:"jwt"`
	SignPayload []int  `json:"signPayload"`
}

func main() {
	fileFlag := flag.String("file", "", "path to text file containing the JWT")
	payloadFlag := flag.String("payload", "", "path to file whose raw bytes become signPayload (optional)")
	urlFlag := flag.String("url", "http://localhost:3000", "service base URL")
	flag.Parse()

	// Support positional arg as file path
	jwtFile := *fileFlag
	if jwtFile == "" && flag.NArg() > 0 {
		jwtFile = flag.Arg(0)
	}
	if jwtFile == "" {
		fmt.Fprintln(os.Stderr, "Usage: send-jwt -file <jwt-file> [-payload <file>] [-url <base-url>]")
		os.Exit(1)
	}

	// Read JWT
	raw, err := os.ReadFile(jwtFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading JWT file: %v\n", err)
		os.Exit(1)
	}
	token := strings.TrimSpace(string(raw))

	// Validate JWT structure
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		fmt.Fprintf(os.Stderr, "Error: JWT must have 3 dot-separated parts, got %d\n", len(parts))
		os.Exit(1)
	}

	// Build signPayload
	var payload []int
	if *payloadFlag != "" {
		data, err := os.ReadFile(*payloadFlag)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading payload file: %v\n", err)
			os.Exit(1)
		}
		payload = make([]int, len(data))
		for i, b := range data {
			payload[i] = int(b)
		}
	} else {
		// "test" in bytes
		payload = []int{116, 101, 115, 116}
	}

	// Print summary
	fmt.Println("--- Sending JWT to Custom Issuer Service ---")
	fmt.Printf("File: %s\n", jwtFile)
	fmt.Printf("Payload: %v (%d bytes)\n", payload, len(payload))
	fmt.Printf("Service URL: %s\n", *urlFlag)
	preview := token
	if len(preview) > 50 {
		preview = preview[:50] + "..."
	}
	fmt.Printf("JWT (first 50 chars): %s\n", preview)
	fmt.Println()

	// Build request
	reqBody := issueRequest{JWT: token, SignPayload: payload}
	body, err := json.Marshal(reqBody)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling request: %v\n", err)
		os.Exit(1)
	}

	endpoint := strings.TrimRight(*urlFlag, "/") + "/issuer/issue"
	fmt.Printf("Sending to %s...\n", endpoint)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(endpoint, "application/json", bytes.NewReader(body))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Connection error: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading response: %v\n", err)
		os.Exit(1)
	}

	// Pretty-print JSON
	var pretty bytes.Buffer
	if json.Indent(&pretty, respBody, "", "  ") != nil {
		pretty.Reset()
		pretty.Write(respBody)
	}

	if resp.StatusCode == http.StatusOK {
		fmt.Printf("✓ Success! Response:\n%s\n", pretty.String())
	} else {
		fmt.Printf("✗ Error (%d):\n%s\n", resp.StatusCode, pretty.String())
		os.Exit(1)
	}
}
