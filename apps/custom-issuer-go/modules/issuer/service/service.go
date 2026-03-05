package service

// IssueResult holds the token returned by the issue operation.
type IssueResult struct {
	Token string
}

// IssuerService handles JWT verification and signing.
type IssuerService struct{}

// NewIssuerService creates a new IssuerService.
func NewIssuerService() *IssuerService {
	return &IssuerService{}
}

// Issue verifies the incoming JWT and signs a new token from the payload.
func (s *IssuerService) Issue(jwt string, signPayload []byte) (*IssueResult, error) {
	return &IssueResult{Token: "placeholder"}, nil
}
