            ,-----------------.
            | GETTING STARTED |
            `-----------------'

Ad-hoc API playground for ledgers.js.

The library is mostly glue code so an ad-hoc integration testing playground 
such as this made sense.

To start watching ledgers.js code for changes...

  npm run watch

... in root folder of repo (one up).

To run an HTTP server serving the test...

  npm run play

... another console, in root folder of repo (one up).

Open browser to http://localhost:8080/play.

Adjust above port as per port actually opened by http-server if different.

Play around with all the functions and observe results.

               ,--------------.
               | INSTRUCTIONS |
               `--------------'

  The pane on the LEFT is the actual rendered 
  example application for you to interact with.

  The TOP-RIGHT pane shows "logs" logged from this
  test application. 
  
  When this test Web application's JavaScript 
  calls a "log" function, the logged message 
  appears in the TOP-RIGHT pane.

  Clicking any log message will scroll the 
  BOTTOM-RIGHT pane to the corresponding 
  JavaScript source code where this log message 
  occurs.
