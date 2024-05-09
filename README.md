#Vizor

View deployment at https://caplin.github.io/vizor/

### Classes
Vizor.js https://stash.caplin.com/projects/TP/repos/vizor/browse/src/Vizor.js 
- Responsible for processing the streamlink logs
- Each log is a LogLine.js object where meta data is applied based on assuming RegExp patterns

LogLine.js https://stash.caplin.com/projects/TP/repos/vizor/browse/src/LogLine.js
- Responsible for applying meta-data to associate a type with each log line
- E.g. CONTRIB, PERMISSION UPDATE, CONTAINER UPDATES etc

### Future Improvements
- Add a free-form `<textArea>` where the user can persist a trade spec matcher in JSON.
- E.G
```
{ 'MsgType=Submit, TradingProtocol=RFS' : {'Account' }
```

The above would then split the matcher string on the `,` separator and check that for all fields that come through in each LogLine.js, whether it meets this matcher.


```
// Example logic:
var matcherString = "MsgType=Submit,TradingProtocol=RFS"
var allMatchers = matcherString.split(',');

for(var i = 0; i < allMatchers.length; i++) {
	var regex = new RegExp[allMatchers[i];
	// check to see through all the current log's tradeFields to see if it matches
}
// if it matches, then simply pull out the key/value for the matcher 
// E.g. pull out 'Account' as a field to ensure that it was included or not etc
// If the field is missing, apply a class to the DOM and insertBefore the collapsed element to show what was missing 
```


