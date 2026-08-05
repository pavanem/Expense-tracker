package com.expensetracker.acceptance;

import io.restassured.response.Response;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class TestContext {

    private Response lastResponse;
    private String token;
    private final Map<String, String> userTokens = new HashMap<>();
    private final Map<String, Object> state = new HashMap<>();

    public Response getLastResponse() {
        return lastResponse;
    }

    public void setLastResponse(Response response) {
        this.lastResponse = response;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public void setUserToken(String username, String token) {
        userTokens.put(username, token);
    }

    public String getUserToken(String username) {
        return userTokens.get(username);
    }

    public void set(String key, Object value) {
        state.put(key, value);
    }

    @SuppressWarnings("unchecked")
    public <T> T get(String key) {
        return (T) state.get(key);
    }

    public void reset() {
        lastResponse = null;
        token = null;
        userTokens.clear();
        state.clear();
    }
}
