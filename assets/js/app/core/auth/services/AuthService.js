(function () {
  'use strict';

  angular.module('frontend.core.auth.services')
    .factory('AuthService', [
      '$http', '$state', '$localStorage', '$rootScope',
      'AccessLevels', 'BackendConfig', 'MessageService',
      function factory($http, $state, $localStorage, $rootScope,
                       AccessLevels, BackendConfig, MessageService) {
        return {
          /**
           * Method to authorize current user with given access level in application.
           *
           * @param   {Number}    accessLevel Access level to check
           *
           * @returns {Boolean}
           */
          authorize: function authorize(accessLevel) {

            if(window.no_auth) return true;

            if (accessLevel === AccessLevels.user) {
              return this.isAuthenticated();
            } else if (accessLevel === AccessLevels.admin) {
              return this.isAuthenticated() && Boolean($localStorage.credentials.user.admin);
            } else {
              return accessLevel === AccessLevels.anon;
            }
          },

          hasPermission: function (context, action) {

            if(window.no_auth) return true;

            var user = $localStorage.credentials ? $localStorage.credentials.user : null;
            if (!user) return false;

            // Normalize action
            action = action || 'read';
            if (action === 'edit') {
              action = 'update';
            }

            var role = user.role || (user.admin ? 'admin' : 'viewer');

            // Admin has full access
            if (role === 'admin') {
              return true;
            }

            // Developer: can create and update, but cannot delete. Cannot manage users or create connections.
            if (role === 'developer') {
              if (context === 'users' && action !== 'read') return false;
              if (context === 'connections' && action === 'create') return false;
              if (context === 'connections' && action === 'delete') return false;
              if (action === 'delete') return false;
              return true;
            }

            // Read is always allowed for authenticated users
            if (action === 'read') {
              return true;
            }

            // Commenter and viewer cannot manage connections
            if (context === 'connections' && action !== 'read') {
              return false;
            }

            // Commenter can add comments
            if (role === 'commenter' && context === 'comments' && action === 'create') {
              return true;
            }

            // Viewer and commenter: no other write permissions
            return false;
          },

          /**
           * Method to check if current user is authenticated or not. This will just
           * simply call 'Storage' service 'get' method and returns it results.
           *
           * @returns {Boolean}
           */
          isAuthenticated: function isAuthenticated() {
            if(window.no_auth) return true;
            return Boolean($localStorage.credentials);
          },


          /**
           * Method to check if current user is an admin or not.
           *
           * @returns {Boolean}
           */
          isAdmin: function isAdmin() {
            if(window.no_auth) return true;
            return $localStorage.credentials && $localStorage.credentials.user && $localStorage.credentials.user.admin;

          },


          token: function token() {
            return $localStorage.credentials ? $localStorage.credentials.token : null;
          },

          /**
           * Method make login request to backend server. Successfully response from
           * server contains user data and JWT token as in JSON object. After successful
           * authentication method will store user data and JWT token to local storage
           * where those can be used.
           *
           * @param   {*} credentials
           *
           * @returns {*|Promise}
           */
          login: function login(credentials) {
            return $http
              .post('login', credentials, {withCredentials: true})
              .then(
                function (response) {
                  MessageService.success('You have logged in successfully!');
                  $localStorage.credentials = response.data;
                  $rootScope.$broadcast('user.login', $localStorage.credentials)
                  $rootScope.user = response.data.user;
                }
              )
              ;
          },

          /**
           * The backend doesn't care about actual user logout, just delete the token
           * and you're good to go.
           *
           * Question still: Should we make logout process to backend side?
           */
          logout: function logout() {
            $localStorage.$reset();
            MessageService.success('You have logged out.');
            $rootScope.user = null;
            $state.go('auth.login');
          }
        };
      }
    ])
  ;
}());
