package models

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/credentials/stscreds"
	"github.com/aws/aws-sdk-go/aws/defaults"
	"github.com/aws/aws-sdk-go/aws/session"
	v4 "github.com/aws/aws-sdk-go/aws/signer/v4"
	"github.com/aws/aws-sdk-go/private/protocol/rest"
)

type AuthType string

const (
	Default     AuthType = "default"
	Keys        AuthType = "keys"
	Credentials AuthType = "credentials"
)

type SigV4Middleware struct {
	Config *Config
	Next   http.RoundTripper
}

type Config struct {
	AuthType string

	Profile string

	DatasourceType string

	AccessKey string
	SecretKey string

	AssumeRoleARN string
	ExternalID    string
	Region        string
}

func (m *SigV4Middleware) RoundTrip(req *http.Request) (*http.Response, error) {
	_, err := m.signRequest(req)
	if err != nil {
		return nil, err
	}

	if m.Next == nil {
		return http.DefaultTransport.RoundTrip(req)
	}

	return m.Next.RoundTrip(req)
}

func (m *SigV4Middleware) signRequest(req *http.Request) (http.Header, error) {
	signer, err := m.signer()
	if err != nil {
		return nil, err
	}

	body, err := replaceBody(req)
	if err != nil {
		return nil, err
	}

	if strings.Contains(req.URL.RawPath, "%2C") {
		req.URL.RawPath = rest.EscapePath(req.URL.RawPath, false)
	}

	// if X-Forwarded-For header is present, omit during signing step as it breaks AWS request verification
	forwardHeader := req.Header.Get("X-Forwarded-For")
	if forwardHeader != "" {
		req.Header.Del("X-Forwarded-For")

		header, err := signer.Sign(req, bytes.NewReader(body), awsServiceNamespace(m.Config.DatasourceType), m.Config.Region, time.Now().UTC())

		// reset pre-existing X-Forwarded-For header value
		req.Header.Set("X-Forwarded-For", forwardHeader)

		return header, err
	}

	return signer.Sign(req, bytes.NewReader(body), awsServiceNamespace(m.Config.DatasourceType), m.Config.Region, time.Now().UTC())
}

func (m *SigV4Middleware) signer() (*v4.Signer, error) {
	c, err := m.credentials()
	if err != nil {
		return nil, err
	}

	if m.Config.AssumeRoleARN != "" {
		s, err := session.NewSession(&aws.Config{
			Region:      aws.String(m.Config.Region),
			Credentials: c},
		)
		if err != nil {
			return nil, err
		}
		return v4.NewSigner(stscreds.NewCredentials(s, m.Config.AssumeRoleARN)), nil
	}

	return v4.NewSigner(c), nil
}

func (m *SigV4Middleware) credentials() (*credentials.Credentials, error) {
	authType := AuthType(m.Config.AuthType)

	switch authType {
	case Default:
		return defaults.CredChain(defaults.Config(), defaults.Handlers()), nil
	case Keys:
		return credentials.NewStaticCredentials(m.Config.AccessKey, m.Config.SecretKey, ""), nil
	case Credentials:
		return credentials.NewSharedCredentials("", m.Config.Profile), nil
	}

	return nil, fmt.Errorf("unrecognized authType: %s", authType)
}

func replaceBody(req *http.Request) ([]byte, error) {
	if req.Body == nil {
		return []byte{}, nil
	}
	payload, err := ioutil.ReadAll(req.Body)
	if err != nil {
		return nil, err
	}
	req.Body = ioutil.NopCloser(bytes.NewReader(payload))
	return payload, nil
}

func awsServiceNamespace(dsType string) string {
	switch dsType {
	case DS_ES:
		return "es"
	case DS_PROMETHEUS:
		return "aps"
	default:
		panic(fmt.Sprintf("Unsupported datasource %s", dsType))
	}
}
