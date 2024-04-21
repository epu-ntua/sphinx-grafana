package api

import (
	"crypto/aes"
	"crypto/cipher"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"

	"github.com/grafana/grafana/pkg/api/dtos"
	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
)

func shouldRedactData(s string) bool {
	uppercased := strings.ToUpper(s)
	return strings.Contains(uppercased, "PASSWORD") || strings.Contains(uppercased, "SECRET") || strings.Contains(uppercased, "PROVIDER_CONFIG")
}

// doPost - executes a post http request
func doPost(endpoint string, params map[string]string, log log.Logger) (retData []byte, retErr error) {
	defer func() {
		if r := recover(); r != nil {
			log.Error("sphinx - doPost - recover: " + fmt.Sprint(r))

			retData = nil
			retErr = r.(error)
		}
	}()

	data := url.Values{}
	for k, v := range params {
		data.Set(k, v)
	}

	log.Info("sphinx - doPost - endpoint = " + endpoint)
	for k, v := range params {
		if shouldRedactData(k) {
			log.Info("sphinx - doPost - params[" + k + "] = ***")
		} else {
			log.Info("sphinx - doPost - params[" + k + "] = " + v)
		}
	}

	response, err := http.PostForm(endpoint, data)
	if err != nil {
		return nil, err
	}

	defer response.Body.Close()
	all, err := ioutil.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	responseContent := string(all)
	log.Info("sphinx - doPost - responseContent = " + responseContent)

	return all, nil
}

type authenticateResponse struct {
	Data        string
	ErrorCode   json.Number
	Description string
}

// authenticate - gets an authentication ticket for an user from SPHINX Service Manager
func authenticate(baseURL string, username string, password string, log log.Logger) (string, error) {
	endpoint := baseURL + "/Authentication"
	fmt.Println(endpoint)
	response, err := doPost(endpoint,
		map[string]string{
			"username": username,
			"password": password,
		},
		log)

	if err != nil {
		return "", err
	}

	var decodedResponse authenticateResponse
	err = json.Unmarshal(response, &decodedResponse)
	if err != nil {
		log.Error("Error decoding authenticateResponse", err)
		return "", err
	}

	log.Info("sphinx - authenticate - decodedResponse = " + fmt.Sprintf("%+v", decodedResponse))

	if decodedResponse.Data != "" {
		return decodedResponse.Data, nil
	}

	if decodedResponse.ErrorCode.String() != "" {
		return "", errors.New("authentication error " + decodedResponse.ErrorCode.String() + " " + decodedResponse.Description)
	}

	return "", errors.New("authentication error - empty properties")
}

// *** createUser ***
type createUserResponse struct {
	Data struct {
		NewUserID   json.Number
		Description string
		ErrorCode   json.Number
	}
}

// createUser - creates an user in SPHINX Service Manager & returns the user id or the error
func createUser(baseURL string, username string, password string, name string, email, ticket string, log log.Logger) (string, error) {
	endpoint := baseURL + "/CreateEndUser/" + ticket

	response, err := doPost(endpoint,
		map[string]string{
			"username": username,
			"password": password,
			"name":     name,
			"email":    email,
		},
		log)

	var decodedResponse createUserResponse
	err = json.Unmarshal(response, &decodedResponse)
	if err != nil {
		log.Error("Error decoding createUserResponse", err)
		return "", err
	}

	log.Info("sphinx - createUser - decodedResponse = " + fmt.Sprintf("%+v", decodedResponse))

	if decodedResponse.Data.NewUserID.String() != "" {
		return decodedResponse.Data.NewUserID.String(), nil
	}

	if decodedResponse.Data.ErrorCode.String() != "" {
		return "", errors.New("createUser error " + decodedResponse.Data.ErrorCode.String() + " " + decodedResponse.Data.Description)
	}

	return "", errors.New("createUser error - empty properties")
}

// *** deleteUser ***
type deleteUserResponse struct {
	Action      string
	Description string
	ErrorCode   json.Number
}

func deleteUser(baseURL string, username string, ticket string, log log.Logger) error {
	endpoint := baseURL + "/DeleteEndUser/" + ticket

	response, err := doPost(endpoint,
		map[string]string{
			"username": username,
		},
		log)

	var decodedResponse deleteUserResponse
	err = json.Unmarshal(response, &decodedResponse)
	if err != nil {
		log.Error("Error decoding deleteUserResponse", err)
		return err
	}

	log.Info("sphinx - deleteUser - decodedResponse = " + fmt.Sprintf("%+v", decodedResponse))

	if decodedResponse.Action == "succeeded" {
		return nil
	}

	if decodedResponse.ErrorCode.String() != "" {
		return errors.New("deleteUser error " + decodedResponse.ErrorCode.String() + " " + decodedResponse.Description)
	}

	return errors.New("deleteUser error - empty properties")
}

// *** setUserState ***
type setUserStateResponse struct {
	Action      string
	Description string
	ErrorCode   json.Number
}

func setUserState(baseURL string, username string, state string, ticket string, log log.Logger) error {
	endpoint := baseURL + "/SetEndUserState/" + ticket

	response, err := doPost(endpoint,
		map[string]string{
			"username": username,
			"state":    state,
		},
		log)

	var decodedResponse setUserStateResponse
	err = json.Unmarshal(response, &decodedResponse)
	if err != nil {
		log.Error("Error decoding setUserStateResponse", err)
		return err
	}

	log.Info("sphinx - setUserState - decodedResponse = " + fmt.Sprintf("%+v", decodedResponse))

	if decodedResponse.Action == "succeeded" {
		return nil
	}

	if decodedResponse.ErrorCode.String() != "" {
		return errors.New("setUserState error " + decodedResponse.ErrorCode.String() + " " + decodedResponse.Description)
	}

	return errors.New("setUserState error - empty properties")

}

// SphinxWrapperLoginPost - wrapper for getting the SM ticket after login
func (hs *HTTPServer) SphinxWrapperLoginPost(c *models.ReqContext, cmd dtos.LoginCommand) Response {
	fmt.Println("Repeat")
	// send the user to SM
	hs.log.Info("sphinx - get authentication token for user " + cmd.User)

	response := hs.LoginPost(c, cmd)

	// concat user+pass in string ==> rezultatul in json langa token
	smUsername := cmd.User
	smPassword := cmd.Password
	if cmd.User == "admin" {
		smUsername = hs.Cfg.SphinxSm.SsoAdminUsername
		smPassword = hs.Cfg.SphinxSm.SsoAdminPassword
	}

	normalResponse, ok := response.(*NormalResponse)
	if ok && normalResponse.status == http.StatusOK {
		// I want to add the SPHINX Service Manager ticket in the map returned by LoginPost
		// In case something fails, the error will be logged but the login process will not fail
		// There will be a message if the user tries to acces another sphinx component
		var result map[string]string
		err := json.Unmarshal(normalResponse.body, &result)
		if err != nil {
			hs.log.Error("sphinx - Error decoding normalReponse.Body", err)
		} else {
			ticket, err := authenticate(hs.Cfg.SphinxSm.BaseURL,
				smUsername, smPassword,
				hs.log)
			if err != nil {
				hs.log.Error("Error authenticating with SM", "error", err)
				// go hs.updateToken(hs.Cfg.SphinxSm.TokenExpires, c, cmd)
			} else {
				result["sphinx_sm_ticket"] = ticket
				//result[usernameparola] = concatenarea criptata de mai sus
				//codul in /get + decriptare
				// intoarce token in client
				// sphinxsmticketaux
				return JSON(http.StatusOK, result)
			}
		}
	}

	return response
}

// SphinxWrapperAdminCreateUser - wrapper for sending the new user to SPHINX Service Manager
func (hs *HTTPServer) SphinxWrapperAdminCreateUser(c *models.ReqContext, form dtos.AdminCreateUserForm) Response {
	// send the user to SM
	hs.log.Info("sphinx - send user to SM: " + form.Login)

	ticket, err := authenticate(hs.Cfg.SphinxSm.BaseURL,
		hs.Cfg.SphinxSm.SsoAdminUsername, hs.Cfg.SphinxSm.SsoAdminPassword,
		hs.log)
	if err != nil {
		hs.log.Error("Error authenticating with SM", "error", err)
		return Error(500, "Error authenticating with SPHINX Service Manager", err)
	}

	_, err = createUser(hs.Cfg.SphinxSm.BaseURL, form.Login, form.Password, form.Name, form.Email, ticket, hs.log)
	if err != nil {
		hs.log.Error("Error sending the user "+form.Login+" to SM", "error", err)
		return Error(500, "Error sending the user to SPHINX Service Manager", err)
	}

	// create the user in Grafana
	return AdminCreateUser(c, form)
}

// SphinxWrapperAdminDeleteUser - wrapper for deleting the user from SPHINX Service Manager
func (hs *HTTPServer) SphinxWrapperAdminDeleteUser(c *models.ReqContext) Response {
	userID := c.ParamsInt64(":id")

	userQuery := models.GetUserByIdQuery{Id: userID}
	if err := bus.Dispatch(&userQuery); err != nil {
		return Error(500, "Could not read user from database", err)
	}

	user := userQuery.Result

	// delete the user to SM
	hs.log.Info("sphinx - delete user from SM: " + user.Login)

	ticket, err := authenticate(hs.Cfg.SphinxSm.BaseURL,
		hs.Cfg.SphinxSm.SsoAdminUsername, hs.Cfg.SphinxSm.SsoAdminPassword,
		hs.log)
	if err != nil {
		hs.log.Error("Error authenticating with SM", "error", err)
		return Error(500, "Error authenticating with SPHINX Service Manager", err)
	}

	err = deleteUser(hs.Cfg.SphinxSm.BaseURL, user.Login, ticket, hs.log)
	if err != nil {
		hs.log.Error("Error deleting the user "+user.Login+" from SM", "error", err)
		return Error(500, "Error deleting the user from SPHINX Service Manager", err)
	}

	// create the user in Grafana
	return AdminDeleteUser(c)
}

// SphinxWrapperAdminEnableUser - wrapper for enabling the user in SPHINX Service Manager
func (hs *HTTPServer) SphinxWrapperAdminEnableUser(c *models.ReqContext) Response {
	userID := c.ParamsInt64(":id")

	userQuery := models.GetUserByIdQuery{Id: userID}
	if err := bus.Dispatch(&userQuery); err != nil {
		return Error(500, "Could not read user from database", err)
	}

	user := userQuery.Result

	// enable the user in SM
	hs.log.Info("sphinx - enable user in SM: " + user.Login)

	ticket, err := authenticate(hs.Cfg.SphinxSm.BaseURL,
		hs.Cfg.SphinxSm.SsoAdminUsername, hs.Cfg.SphinxSm.SsoAdminPassword,
		hs.log)
	if err != nil {
		hs.log.Error("Error authenticating with SM", "error", err)
		return Error(500, "Error authenticating with SPHINX Service Manager", err)
	}

	err = setUserState(hs.Cfg.SphinxSm.BaseURL, user.Login, "enabled", ticket, hs.log)
	if err != nil {
		hs.log.Error("Error enabling the user "+user.Login+" in SM", "error", err)
		return Error(500, "Error enabling the user in SPHINX Service Manager", err)
	}

	// create the user in Grafana
	return AdminEnableUser(c)
}

// SphinxWrapperAdminDisableUser - wrapper for disabling the user in SPHINX Service Manager
func (hs *HTTPServer) SphinxWrapperAdminDisableUser(c *models.ReqContext) Response {
	userID := c.ParamsInt64(":id")

	userQuery := models.GetUserByIdQuery{Id: userID}
	if err := bus.Dispatch(&userQuery); err != nil {
		return Error(500, "Could not read user from database", err)
	}

	user := userQuery.Result

	// disable the user in SM
	hs.log.Info("sphinx - disable user in SM: " + user.Login)

	ticket, err := authenticate(hs.Cfg.SphinxSm.BaseURL,
		hs.Cfg.SphinxSm.SsoAdminUsername, hs.Cfg.SphinxSm.SsoAdminPassword,
		hs.log)
	if err != nil {
		hs.log.Error("Error authenticating with SM", "error", err)
		return Error(500, "Error authenticating with SPHINX Service Manager", err)
	}

	err = setUserState(hs.Cfg.SphinxSm.BaseURL, user.Login, "disabled", ticket, hs.log)
	if err != nil {
		hs.log.Error("Error disabling the user "+user.Login+" in SM", "error", err)
		return Error(500, "Error disabling the user in SPHINX Service Manager", err)
	}

	// create the user in Grafana
	return hs.AdminDisableUser(c)
}

// Sphinx SM Login
func (hs *HTTPServer) SphinxWrapperLoginPostSM(c *models.ReqContext, cmd dtos.LoginModel) Response {

	// Decrypt credentials
	decryptedCredentials, err := Decrypt(cmd.Sphinxsmticketaux, "7061737323313233")
	if err != nil {
		fmt.Println(err)
	}
	fmt.Println(decryptedCredentials)
	credentials := strings.Fields(decryptedCredentials)

	// send the user to SM
	hs.log.Info("sphinx - get authentication token for user " + credentials[0])

	var loginCommand dtos.LoginCommand
	loginCommand.User = credentials[0]
	loginCommand.Password = credentials[1]

	response := hs.LoginPostSM(c, cmd)

	// concat user+pass in string ==> rezultatul in json langa token
	smUsername := loginCommand.User
	smPassword := loginCommand.Password
	if loginCommand.User == "admin" {
		smUsername = hs.Cfg.SphinxSm.SsoAdminUsername
		smPassword = hs.Cfg.SphinxSm.SsoAdminPassword
	}

	normalResponse, ok := response.(*NormalResponse)
	if ok && normalResponse.status == http.StatusOK {
		// I want to add the SPHINX Service Manager ticket in the map returned by LoginPost
		// In case something fails, the error will be logged but the login process will not fail
		// There will be a message if the user tries to acces another sphinx component
		var result map[string]string
		err := json.Unmarshal(normalResponse.body, &result)
		if err != nil {
			hs.log.Error("sphinx - Error decoding normalReponse.Body", err)
		} else {
			ticket, err := authenticate(hs.Cfg.SphinxSm.BaseURL,
				smUsername, smPassword,
				hs.log)
			if err != nil {
				hs.log.Error("Error authenticating with SM", "error", err)
			} else {
				result["sphinx_sm_ticket"] = ticket
				//result[usernameparola] = concatenarea criptata de mai sus
				//codul in /get + decriptare
				// intoarce token in client
				// sphinxsmticketaux
				return JSON(http.StatusOK, result)
			}
		}
	}

	return response
}

// Decryption of credentials
func Decryption(key []byte, ciphertext []byte) string {
	c, _ := aes.NewCipher(key)
	gcm, _ := cipher.NewGCM(c)

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		panic("ciphertext size is less than nonceSize")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, _ := gcm.Open(nil, nonce, ciphertext, nil)

	return string(plaintext)
}
