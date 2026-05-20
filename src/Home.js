import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  FormGroup,
  Typography,
  Link,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListSubheader,
  ListItemAvatar,
  CircularProgress,
  IconButton,
  InputBase,
  Divider,
  Snackbar,
  Container,
  Paper
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { CheckCircle, ContentCopy } from "mdi-material-ui";
import { HighlightOff, ImportExport, AccessTime } from "@material-ui/icons";
import {
  api,
  findFingerprint,
  getHash,
  getIpfsCid,
  getMattersHash,
  parseFingerprintManifest
} from "./utils";
import SnackBarContentWrapper from "./components/SnackBarContent";
import gateways from "./public-gateway";
import "./Home.css";
const useStyles = makeStyles(theme => ({
  root: {
    paddingBottom: 30
  },
  button: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  buttonGrow: {
    flexGrow: 1
  },
  buttonBox: {},
  buttonIcon: {
    marginRight: theme.spacing(1)
  },
  formControl: {
    marginRight: theme.spacing(4),
    minWidth: 120
  },
  listItem: {
    wordBreak: "break-all"
  },
  buttonSplit: {
    flex: 1
  },
  legend: {
    color: "rgba(0, 0, 0, 0.38)"
  },
  loading: {
    margin: theme.spacing(4),
    display: "flex",
    justifyContent: "center"
  },
  divider: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4)
  },
  close: {
    padding: theme.spacing(0.5)
  },
  error: {
    backgroundColor: "red"
  },
  heroContent: {
    padding: theme.spacing(8, 0, 6)
  },
  buttonRight: {
    marginLeft: theme.spacing(4)
  },
  space: {
    marginLeft: theme.spacing(1)
  },
  priButton: {
    justifyContent: "flex-end"
  },
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  centerButton: {
    marginTop: theme.spacing(4),
    justifyContent: "center"
  },
  overAvatar: {
    minWidth: 0,
    paddingRight: theme.spacing(1)
  },
  subheader: {
    top: "auto",
    zIndex: "auto",
    position: "static"
  },
  inputRoot: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(4),
    padding: "2px 4px",
    display: "flex",
    alignItems: "center"
  },
  input: {
    marginLeft: 8,
    flex: 1
  },
  iconButton: {
    padding: 10
  },
  inputDivider: {
    width: 1,
    height: 28,
    margin: 4
  }
}));
let resultId = 1;
export default function Home() {
  const classes = useStyles();
  // get search params
  const searchParams = new URLSearchParams(window.location.search);
  const searchUrl = searchParams.get("url") || "";
  const checkedCorsApi = searchParams.get("checked_cors") || "";
  const mattersEndpoint = searchParams.get("graphql_endpoint") || "";
  const mattersCors = searchParams.get("cors") || "";
  const mattersCorsNeedEncode = searchParams.get("cors_need_encode") || 0;
  const mattersCorsIndex = searchParams.get("cors_index") || null;
  const [isLoading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [mediaHash, setMediaHash] = useState("");
  const [hash, setHash] = useState("");
  const [autoConvert, setAutoConvert] = useState(false);
  const [checkedStat, setCheckedStat] = useState({
    id: resultId,
    count: 0,
    checkedCount: 0,
    onlineCount: 0,
    offlineCount: 0
  });
  const [checkedMap, setCheckedMap] = useState({});
  const getUrlError = url => {
    return false;
  };
  const [open, setOpen] = useState(false);
  const [openError, setOpenError] = useState(false);
  const [isInit, setIsInit] = useState(false);
  const [urlError, setUrlError] = useState(getUrlError(url));
  const [errorMessage, setErrorMessage] = useState("");

  const handleChangeHashes = items => {
    const currentItems = items.filter(item => item.hash);
    if (currentItems.length > 0) {
      const currentCheckedMap = {};
      currentItems.forEach((currentItem, itemIndex) => {
        for (let i = 0; i < gateways.length; i++) {
          const gateway = gateways[i];
          const gatewayAndHash = gateway.replace(":hash", currentItem.hash);
          // opt-out from gateway redirects done by browser extension
          const corsHost = checkedCorsApi;
          const displayUrl = corsHost + gatewayAndHash;
          const requestUrl = displayUrl + "#x-ipfs-companion-no-redirect";
          currentCheckedMap[`${itemIndex}-${currentItem.hash}-${displayUrl}`] = {
            displayUrl: displayUrl,
            requestUrl: requestUrl,
            title: currentItem.title,
            sourceUrl: currentItem.sourceUrl,
            status: "checking"
          };
        }
      });

      setCheckedMap(currentCheckedMap);
      const keys = Object.keys(currentCheckedMap);
      setCheckedStat(prevCheckedStat => {
        return {
          count: keys.length,
          checkedCount: 0,
          onlineCount: 0,
          offlineCount: 0
        };
      });
      keys.forEach(key => {
        const item = currentCheckedMap[key];
        const start = Date.now();
        const currentResultId = resultId;
        api(item.requestUrl)
          .then(() => {
            const end = Date.now();
            const spend = end - start;
            setCheckedStat(prevCheckedStat => {
              const currentCheckedStat = Object.assign({}, prevCheckedStat);
              if (resultId === currentResultId) {
                currentCheckedStat.checkedCount++;
                currentCheckedStat.onlineCount++;
              }
              return currentCheckedStat;
            });
            setCheckedMap(prevCheckedMap => {
              const checkedMapState = Object.assign({}, prevCheckedMap);
              if (checkedMapState[key] && resultId === currentResultId) {
                checkedMapState[key].status = "online";
                checkedMapState[key].timeout = spend;
              }
              return checkedMapState;
            });
          })
          .catch(e => {
            setCheckedStat(prevCheckedStat => {
              const currentCheckedStat = Object.assign({}, prevCheckedStat);
              if (resultId === currentResultId) {
                currentCheckedStat.checkedCount++;
                currentCheckedStat.offlineCount++;
              }
              return currentCheckedStat;
            });
            setCheckedMap(prevCheckedMap => {
              const checkedMapState = Object.assign({}, prevCheckedMap);
              if (checkedMapState[key] && resultId === currentResultId) {
                checkedMapState[key].status = "offline";
                checkedMapState[key].error = e.message || "Timeout!";
              }
              return checkedMapState;
            });
          });
      });
    }
  };

  const handleChangeHash = currentHash => {
    handleChangeHashes([{ hash: currentHash }]);
  };

  const handleChangeUrl = e => {
    const currentUrl = e.target.value;
    const isUrlError = getUrlError(currentUrl);
    setUrl(currentUrl);
    setUrlError(isUrlError);
    setMediaHash(getHash(currentUrl));
  };
  function handleClose(event, reason) {
    if (reason === "clickaway") {
      return;
    }
    setOpen(false);
  }

  function handleCloseError(event, reason) {
    if (reason === "clickaway") {
      return;
    }
    setOpenError(false);
  }
  function getResults() {
    const keys = Object.keys(checkedMap);
    const results = keys.map(key => {
      return checkedMap[key];
    });
    return results;
  }

  const handleConvert = async () => {
    const input = url.trim();
    if (!input) {
      setErrorMessage(`Please input an IPFS CID, IPFS URL, or Matters article url`);
      setOpenError(true);
      return;
    }
    resultId++;

    // setloading
    setLoading(true);
    setCheckedStat({
      count: 0,
      checkedCount: 0,
      onlineCount: 0,
      offlineCount: 0
    });
    setCheckedMap({});
    const directCid = getIpfsCid(input);
    if (directCid) {
      setHash(directCid);
      handleChangeHash(directCid);
      setLoading(false);
      return;
    }

    const manifest = parseFingerprintManifest(input);
    if (manifest) {
      const items = manifest.articles
        .filter(article => article && article.dataHash)
        .map(article => ({
          hash: article.dataHash,
          title: article.title,
          sourceUrl: article.sourceUrl
        }));
      setHash(items.map(item => item.hash).join(","));
      handleChangeHashes(items);
      setLoading(false);
      return;
    }

    if (!mediaHash) {
      setErrorMessage(`Please input an IPFS CID, IPFS URL, or valid Matters article url`);
      setOpenError(true);
      setLoading(false);
      return;
    }

    try {
      const fingerprint = findFingerprint(manifest, input);
      if (fingerprint && fingerprint.dataHash) {
        setHash(fingerprint.dataHash);
        handleChangeHash(fingerprint.dataHash);
        setLoading(false);
        return;
      }
      const mattersParams = {
        mediaHash: mediaHash
      };
      if (mattersEndpoint) {
        mattersParams.endpoint = mattersEndpoint;
      }
      if (mattersCors) {
        mattersParams.cors = mattersCors;
        if (mattersCorsNeedEncode === "1") {
          mattersParams.corsNeedEncode = true;
        }
      } else if (mattersCorsIndex !== null) {
        mattersParams.corsIndex = Number(mattersCorsIndex);
      }
      const mattersResult = await getMattersHash(mattersParams);
      if (
        mattersResult &&
        mattersResult.article &&
        mattersResult.article.dataHash
      ) {
        const { dataHash } = mattersResult.article;
        setHash(dataHash);
        handleChangeHash(dataHash);
      } else if (mattersResult && mattersResult.article === null) {
        setErrorMessage(
          `Can't get the matters dataHash, this may cause by your matters url`
        );
        setOpenError(true);
      } else {
        setErrorMessage(
          `Can't get the matters dataHash, this may cause by our convert server error`
        );
        setOpenError(true);
      }
    } catch (error) {
      setErrorMessage(error.message);
      setOpenError(true);
    }
    setLoading(false);
  };

  const handleClickRandom = () => {
    const newUrl =
      "QmdaT2M2sGQE6kxPbN2BztCHt7sB3sz13B8S3UVhpD64iM";

    handleChangeUrl({
      target: {
        value: newUrl
      }
    });
    setAutoConvert(true);
  };
  const handleClickCopy = () => {
    setOpen(true);
  };
  useEffect(() => {
    if (!isInit) {
      setIsInit(true);
    }
    if (!isInit && searchUrl) {
      setAutoConvert(true);
      handleChangeUrl({
        target: {
          value: searchUrl
        }
      });
    } else if (isInit && autoConvert) {
      setAutoConvert(false);
      handleConvert();
    }
  }, [
    isInit,
    searchUrl,
    autoConvert,
    setIsInit,
    setAutoConvert,
    handleChangeUrl,
    handleConvert
  ]);
  const currentPageAutoLink = `${window.location.protocol}//${
    window.location.host
  }/?url=${encodeURIComponent(url)}`;
  return (
    <div className={classes.root}>
      {/* Hero unit */}
      <div className={classes.heroContent}>
        <Container maxWidth="md">
          <Typography
            component="h1"
            variant="h2"
            align="center"
            color="textPrimary"
            gutterBottom
          >
            Convert{" "}
            <Link
              href="https://matters.town"
              target="_blank"
              rel="noopener noreferrer"
            >
              Matters
            </Link>{" "}
            to{" "}
            <Link
              href="https://contributionls.github.io/public-gateway-checker/"
              target="_blank"
              rel="noopener noreferrer"
            >
              IPFS
            </Link>
          </Typography>
        </Container>
      </div>
      <FormGroup>
        <TextField
          id={`url`}
          required
          autoFocus={true}
          inputProps={{
            autoComplete: "off"
          }}
          label={`IPFS CID, IPFS URL, or Matters Article Url`}
          type="text"
          placeholder="QmdaT2M2sGQE6kxPbN2BztCHt7sB3sz13B8S3UVhpD64iM"
          onChange={handleChangeUrl}
          value={url}
          variant="outlined"
          margin="normal"
          error={urlError}
          helperText={urlError ? "URL is invalid!" : ""}
        />
        <FormGroup row className={classes.centerButton}>
          <Button
            onClick={handleConvert}
            color="primary"
            size="large"
            variant="outlined"
            disabled={isLoading}
            className={`${classes.button}`}
          >
            {isLoading ? (
              <CircularProgress
                size={20}
                color="inherit"
                className={classes.buttonIcon}
              />
            ) : (
              <ImportExport fontSize="small" className={classes.buttonIcon} />
            )}
            Convert
          </Button>
          <Button
            onClick={handleClickRandom}
            variant="outlined"
            color="default"
            size="large"
            className={`${classes.button} ${classes.buttonRight}`}
          >
            Example
          </Button>
        </FormGroup>
        {hash ? (
          <div>
            <Divider className={classes.divider} />
            <List
              aria-labelledby="nested-list-subheader"
              subheader={
                <ListSubheader
                  component="div"
                  className={classes.subheader}
                  id="nested-list-subheader"
                >
                  {checkedStat.checkedCount}/{checkedStat.count} gateways,{" "}
                  {checkedStat.onlineCount} are online,{" "}
                  {checkedStat.offlineCount} are offline
                </ListSubheader>
              }
              dense={false}
            >
              {getResults().map((item, index) => {
                return (
                  <ListItem key={`key_${index}`}>
                    <ListItemAvatar
                      className={`${classes.center} ${classes.overAvatar}`}
                    >
                      <div>
                        {item.status === "init" ? (
                          <AccessTime color="disabled" />
                        ) : null}
                        {item.status === "checking" ? (
                          <CircularProgress
                            size={20}
                            color="secondary"
                            className={classes.buttonIcon}
                          />
                        ) : null}
                        {item.status === "offline" ? (
                          <HighlightOff color="error" />
                        ) : null}
                        {item.status === "online" ? (
                          <CheckCircle color="primary" />
                        ) : null}
                      </div>
                    </ListItemAvatar>
                    <ListItemText
                      primaryTypographyProps={{
                        className: classes.listItem
                      }}
                      primary={
                        <React.Fragment>
                          {item.title ? (
                            <Typography variant="body2">
                              {item.sourceUrl ? (
                                <Link
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  href={item.sourceUrl}
                                >
                                  {item.title}
                                </Link>
                              ) : (
                                item.title
                              )}
                            </Typography>
                          ) : null}
                          <Link
                            target="_blank"
                            rel="noopener noreferrer"
                            href={item.displayUrl}
                          >
                            {item.displayUrl}
                          </Link>
                        </React.Fragment>
                      }
                      secondary={
                        item.status === "offline"
                          ? item.error
                          : item.status === "online"
                          ? `${item.timeout}ms`
                          : null
                      }
                    />
                    <ListItemSecondaryAction>
                      <CopyToClipboard
                        text={item.displayUrl}
                        onCopy={handleClickCopy}
                      >
                        <IconButton edge="end" aria-label="copy">
                          <ContentCopy />
                        </IconButton>
                      </CopyToClipboard>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
            <Divider className={classes.divider} />
            <Typography variant="h5" component="h3">
              Want a link that automatically checks the IPFS address of the
              article?
            </Typography>
            <Paper className={classes.inputRoot}>
              <InputBase
                value={currentPageAutoLink}
                className={classes.input}
                placeholder="Search Google Maps"
                inputProps={{ "aria-label": "search google maps" }}
              />
              <IconButton className={classes.iconButton} aria-label="copy">
                <CopyToClipboard
                  text={currentPageAutoLink}
                  onCopy={handleClickCopy}
                >
                  <ContentCopy />
                </CopyToClipboard>
              </IconButton>
            </Paper>
          </div>
        ) : null}
      </FormGroup>
      <Snackbar
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left"
        }}
        open={open}
        autoHideDuration={1500}
        onClose={handleClose}
      >
        <SnackBarContentWrapper
          onClose={handleClose}
          variant="success"
          message="The url has be copied!"
        />
      </Snackbar>
      <Snackbar
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left"
        }}
        open={openError}
        autoHideDuration={2500}
        onClose={handleCloseError}
      >
        <SnackBarContentWrapper
          onClose={handleCloseError}
          variant="error"
          message={errorMessage}
        />
      </Snackbar>
    </div>
  );
}
