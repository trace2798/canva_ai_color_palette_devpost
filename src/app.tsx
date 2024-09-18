import {
  Alert,
  Box,
  Button,
  ColorSelector,
  FormField,
  Grid,
  ImageCard,
  Masonry,
  MasonryItem,
  MultilineInput,
  ReloadIcon,
  Rows,
  SlidersIcon,
  Switch,
  Text,
  TextInput,
  Title,
  TrashIcon,
} from "@canva/app-ui-kit";
import { upload } from "@canva/asset";
import { initAppElement } from "@canva/design";
import React, { useEffect, useState } from "react";
import styles from "styles/components.css";
import { auth } from "@canva/user";

const BACKEND_URL = `https://empty-pond-29ea.shreyaschaliha27.workers.dev`;
const BACKEND_EDIT_URL = `${BACKEND_URL}/edit-palette`;

type UIState = {
  prompt: string;
  showText: boolean;
  showColorName: boolean;
  editImagePrompt?: string;
};

const initialState: UIState = {
  prompt: "",
  showText: true,
  showColorName: true,
  editImagePrompt: "",
};

type AppElementData = {
  colors: { hex: string; name: string }[];
  showText: boolean;
  showColorName: boolean;
};

const appElementClient = initAppElement<AppElementData>({
  render: (data) => {
    const dataUrl = createPalette(
      data.colors,
      data.showText,
      data.showColorName
    );
    return [
      {
        type: "IMAGE",
        dataUrl,
        width: 2400,
        height: 1800,
        top: 0,
        left: 0,
      },
    ];
  },
});

export const App = () => {
  const [state, setState] = React.useState<UIState>(initialState);
  const [isLoading, setIsLoading] = React.useState(false);
  const [responseBody, setResponseBody] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [aiEditing, setAiEditing] = useState(false);
  const [selectedElementIsValid, setSelectedElementIsValid] = useState(false);
  const [userEditInput, setUserEditInput] = useState("");
  const { prompt, showText, showColorName } = state;

  const [colorState, setColorState] = React.useState({
    colors: [{ hex: "", name: "" }],
    isSelected: false,
  });

  useEffect(() => {
    appElementClient.registerOnElementChange((element) => {
      if (element && validateColors(element.data.colors)) {
        //console.log("Element Data", element.data);
        setColorState({
          colors: element.data.colors,
          isSelected: true,
        });
        //console.log("oink oink");
        setSelectedElementIsValid(true);
      } else {
        //console.log("No element data found");
        setSelectedElementIsValid(false);
      }
    });
  }, []);

  const validateColors = (colors) => {
    if (Array.isArray(colors)) {
      return colors.every(
        (color) =>
          typeof color.hex === "string" && typeof color.name === "string"
      );
    }
    return false;
  };

  const handleColorPaletteRequest = async () => {
    try {
      setIsLoading(true);
      const token = await auth.getCanvaUserToken();
      setErrorMessage(""); // Clear any previous error message
      const res = await fetch(BACKEND_URL, {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: state.prompt,
          token: token,
        }),
        method: "POST",
      });
      const body = await res.json();
      //console.log("Body Body", body.message);
      setResponseBody(body.message);
      const colors = parseColorsFromResponse(body.message);
      if (colors.length === 0) {
        setErrorMessage(
          "Oopsie-doodle! Looks like that prompt confused our AI friend. Give it another go with something clearer!"
        );
        return;
      }
      setColorState((prevState) => ({
        ...prevState,
        colors: colors.map(([hex, name]) => ({ hex, name })),
      }));
    } catch (error) {
      //console.error(error);
      setResponseBody("");
      setErrorMessage(
        "Uh-oh! The AI is having a little nap. Try again or give our support team a shout!"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditColorPaletteRequest = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(""); // Clear any previous error message
      const token = await auth.getCanvaUserToken();
      const res = await fetch(BACKEND_EDIT_URL, {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Current the colors on the palette are ${colorState.colors
            .map((color) => `#${color.hex} (${color.name})`)
            .join(", ")} change it to: ${userEditInput}`,
          token: token,
        }),
        method: "POST",
      });
      const body = await res.json();
      //console.log("Body Body", body.message);
      setResponseBody(body.message);
      const colors = parseColorsFromResponse(body.message);
      if (colors.length === 0) {
        setErrorMessage(
          "Oopsie-daisy! Looks like the colors are playing hide and seek. Give it another whirl with a different prompt!"
        );
        return;
      }
      setColorState((prevState) => ({
        ...prevState,
        colors: colors.map(([hex, name]) => ({ hex, name })),
      }));
    } catch (error) {
      //console.error(error);
      setResponseBody("");
      setErrorMessage(
        "Uh-oh! The AI is having a little nap. Try again or give our support team a shout!"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddColor = () => {
    setColorState((prevState) => ({
      ...prevState,
      colors: [...prevState.colors, { hex: "ffffff", name: "white" }],
    }));
  };

  const handleBackClick = () => {
    setAiEditing(false);
    setEditing(false);
    // setResponseBody("");
    // setUserEditInput("");
  };

  const handleRemoveColor = (index: number) => {
    setColorState((prevState) => ({
      ...prevState,
      colors: prevState.colors.filter((_, i) => i !== index),
    }));
  };

  const handleToggleEditing = () => {
    //console.log("Color State", colorState);
    setEditing(true);
  };

  const handleToggleAIEditing = () => {
    //console.log("Color State", colorState);
    setAiEditing(true);
  };

  const handleClick = async () => {
    appElementClient.addOrUpdateElement({
      colors: colorState.colors,
      showText: state.showText,
      showColorName: state.showColorName,
    });
    const dataUrl = createPalette(
      colorState.colors,
      state.showText,
      state.showText
    );
    //console.log("Data Url", dataUrl);
    await upload({
      type: "IMAGE",
      mimeType: "image/png",
      url: dataUrl,
      thumbnailUrl: dataUrl,
      width: 2400,
      height: 1800,
    });
  };

  const handleChangeColor = (index: number, color: string) => {
    const newColors = colorState.colors.map((col, i) => {
      if (i === index) {
        return { ...col, hex: color.replace("#", "") };
      }
      return col;
    });
    setColorState((prevState) => ({
      ...prevState,
      colors: newColors,
    }));
  };

  const handleChangeName = (index: number, name: string) => {
    const newColors = colorState.colors.map((col, i) => {
      if (i === index) {
        return { ...col, name: name };
      }
      return col;
    });
    setColorState((prevState) => ({
      ...prevState,
      colors: newColors,
    }));
  };

  return (
    <div className={styles.scrollContainer}>
      <div style={{ height: "90vh", maxHeight: "90vh" }}>
        {aiEditing ? (
          <Rows spacing="2u">
            <Title size="medium">Edit Palette with AI</Title>
            {errorMessage ? (
              <Alert tone="info">{errorMessage}</Alert>
            ) : (
              <ImageCard
                alt="color palette image"
                ariaLabel="Add image to design"
                borderRadius="standard"
                onClick={handleClick}
                onDragStart={() => {}}
                thumbnailUrl={createPalette(
                  colorState.colors,
                  state.showText,
                  state.showColorName
                )}
                selectable={true}
              />
            )}

            <FormField
              label="Edit Color Palette with AI"
              value={userEditInput}
              control={(props) => (
                <MultilineInput
                  placeholder="Describe the color palette you want. A detailed description will yield better result."
                  minRows={3}
                  maxRows={5}
                  {...props}
                  onChange={(value) => {
                    setUserEditInput(value);
                  }}
                  required={true}
                />
              )}
            />
            <Box padding="1u" borderRadius="large" background="neutralLow">
              <Rows spacing="1u">
                <Title size="small">Options</Title>
                <Switch
                  defaultValue={showText}
                  onChange={() =>
                    setState((prevState) => ({
                      ...prevState,
                      showText: !prevState.showText,
                    }))
                  }
                  label="Show Hex on Color Palette"
                />
                <Switch
                  defaultValue={showColorName}
                  onChange={() =>
                    setState((prevState) => ({
                      ...prevState,
                      showColorName: !prevState.showColorName,
                    }))
                  }
                  label="Show color name on Color Palette"
                />
              </Rows>
            </Box>
            <Button
              variant="primary"
              onClick={handleEditColorPaletteRequest}
              disabled={isLoading || userEditInput.trim().length < 3}
              loading={isLoading}
              stretch
            >
              Edit Color Palette with AI
            </Button>
            <Button
              onClick={handleBackClick}
              variant="secondary"
              alignment="center"
            >
              Back
            </Button>
          </Rows>
        ) : editing ? (
          <Rows spacing="2u">
            <Title size="medium">AI Palette Edit</Title>
            <ImageCard
              alt="gradient image"
              ariaLabel="Add image to design"
              borderRadius="standard"
              onClick={handleClick}
              onDragStart={() => {}}
              thumbnailUrl={createPalette(
                colorState.colors,
                state.showText,
                state.showColorName
              )}
              selectable={true}
            />
            <Box padding="1u" borderRadius="large" background="neutralLow">
              <Title size="small">Colors</Title>
              <Rows spacing="3u">
                <Rows spacing="1u">
                  {colorState.colors.map((color, index) => (
                    <Rows key={index} spacing="1u">
                      <Masonry targetRowHeightPx={40}>
                        <MasonryItem targetHeightPx={40} targetWidthPx={45}>
                          <FormField
                            label=""
                            control={() => (
                              <ColorSelector
                                color={`#${color.hex}`}
                                onChange={(color) =>
                                  handleChangeColor(index, color)
                                }
                              />
                            )}
                          />
                        </MasonryItem>
                        <MasonryItem targetHeightPx={40} targetWidthPx={190}>
                          <FormField
                            label=""
                            control={() => (
                              <TextInput
                                value={color.name}
                                onChange={(name) =>
                                  handleChangeName(index, name)
                                }
                              />
                            )}
                          />
                        </MasonryItem>
                        <MasonryItem targetHeightPx={40} targetWidthPx={10}>
                          <FormField
                            label=""
                            control={() => (
                              <Button
                                variant="tertiary"
                                disabled={colorState.colors.length <= 2}
                                onClick={() => handleRemoveColor(index)}
                                icon={() => <TrashIcon />}
                              ></Button>
                            )}
                          />
                        </MasonryItem>
                      </Masonry>
                    </Rows>
                  ))}
                </Rows>
                <Button variant="primary" onClick={handleAddColor}>
                  Add Color
                </Button>
              </Rows>
            </Box>
            <Box padding="1u" borderRadius="large" background="neutralLow">
              <Rows spacing="1u">
                <Title size="small">Options</Title>
                <Switch
                  defaultValue={showText}
                  onChange={() =>
                    setState((prevState) => ({
                      ...prevState,
                      showText: !prevState.showText,
                    }))
                  }
                  label="Show Hex on Color Palette"
                />
                <Switch
                  defaultValue={showColorName}
                  onChange={() =>
                    setState((prevState) => ({
                      ...prevState,
                      showColorName: !prevState.showColorName,
                    }))
                  }
                  label="Show color name on Color Palette"
                />
              </Rows>
            </Box>
            <Button
              onClick={() => setEditing(false)}
              variant="secondary"
              alignment="center"
            >
              Back
            </Button>
          </Rows>
        ) : (
          <>
            <Rows spacing="2u">
              <FormField
                label="Description of Color Palette"
                value={prompt}
                control={(props) => (
                  <MultilineInput
                    placeholder="Describe the color palette you want. A detailed description will yield better result."
                    minRows={3}
                    maxRows={5}
                    {...props}
                    onChange={(value) => {
                      setState((prevState) => {
                        return {
                          ...prevState,
                          prompt: value,
                        };
                      });
                    }}
                    required={true}
                  />
                )}
              />
              {responseBody && state.prompt === prompt ? (
                <Button
                  variant="secondary"
                  onClick={handleColorPaletteRequest}
                  icon={() => <ReloadIcon />}
                  disabled={isLoading}
                  loading={isLoading}
                  stretch
                >
                  Regenerate
                </Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    onClick={handleColorPaletteRequest}
                    disabled={isLoading || prompt.trim().length < 3}
                    loading={isLoading}
                    stretch
                  >
                    Generate Color Palette
                  </Button>
                  {selectedElementIsValid && (
                    <>
                      <Button
                        icon={() => <SlidersIcon />}
                        variant="secondary"
                        onClick={handleToggleEditing}
                      >
                        Customize Selected Palette
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleToggleAIEditing}
                      >
                        Edit with AI
                      </Button>
                    </>
                  )}
                </>
              )}
              {responseBody && colorState.colors.length > 0 && (
                <Rows spacing="2u">
                  <Title size="medium">AI Generated Palette</Title>
                  {errorMessage ? (
                    <Alert tone="info">{errorMessage}</Alert>
                  ) : (
                    <>
                      {colorState.colors.length < 2 ? (
                        ""
                      ) : (
                        <>
                          <ImageCard
                            alt="gradient image"
                            ariaLabel="Add image to design"
                            borderRadius="standard"
                            onClick={handleClick}
                            onDragStart={() => {}}
                            thumbnailUrl={createPalette(
                              colorState.colors,
                              state.showText,
                              state.showColorName
                            )}
                            selectable={true}
                          />
                          <Box
                            padding="1u"
                            borderRadius="large"
                            background="neutralLow"
                          >
                            <Title size="small">Colors</Title>
                            <Grid columns={5} spacingX="3u">
                              {responseBody &&
                                colorState.colors.map((color, index) => (
                                  <FormField
                                    key={index}
                                    label=""
                                    control={() => (
                                      <ColorSelector
                                        color={`#${color.hex}`}
                                        onChange={() => {}}
                                      />
                                    )}
                                  />
                                ))}
                            </Grid>
                          </Box>
                          <Box
                            padding="1u"
                            borderRadius="large"
                            background="neutralLow"
                          >
                            <Rows spacing="1u">
                              <Title size="small">Options</Title>
                              <Switch
                                defaultValue={showText}
                                onChange={() =>
                                  setState((prevState) => ({
                                    ...prevState,
                                    showText: !prevState.showText,
                                  }))
                                }
                                label="Show Hex on Color Palette"
                              />
                              <Switch
                                defaultValue={showColorName}
                                onChange={() =>
                                  setState((prevState) => ({
                                    ...prevState,
                                    showColorName: !prevState.showColorName,
                                  }))
                                }
                                label="Show color name on Color Palette"
                              />
                            </Rows>
                          </Box>
                          <Button
                            variant="primary"
                            onClick={handleToggleEditing}
                          >
                            Customize Generated Palette
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={handleToggleAIEditing}
                          >
                            Edit with AI
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </Rows>
              )}
            </Rows>
          </>
        )}
      </div>
      {!editing && !responseBody && (
        <div>
          <Box
            background="neutralLow"
            border="standard"
            padding="0.5u"
            paddingX="1u"
            borderRadius="large"
          >
            <Text size="xsmall" tone="tertiary" alignment="center">
              AI Generated answers may not be 100% accurate.
              <br /> Use at your own risk
            </Text>
          </Box>
        </div>
      )}
    </div>
  );
};

function parseColorsFromResponse(response: string): [string, string][] {
  const colorRegex = /#([0-9A-Fa-f]{6})\s*\((.*?)\)/g;
  const matches: [string, string][] = [];
  let match;

  while ((match = colorRegex.exec(response)) !== null) {
    matches.push([match[1], match[2]]);
  }
  //console.log(matches);
  return matches;
}

function createPalette(
  colors: { hex: string; name: string }[],
  showText: boolean,
  showColorName: boolean
): string {
  const canvas = document.createElement("canvas");

  canvas.width = 1920;
  canvas.height = 1080;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Can't get CanvasRenderingContext2D");
  }

  const numColors = colors.length;
  const rectWidth = canvas.width / numColors;
  colors.forEach((color, index) => {
    ctx.fillStyle = `#${color.hex}`;
    ctx.fillRect(index * rectWidth, 0, rectWidth, canvas.height);

    if (showText || showColorName) {
      ctx.fillStyle = getContrastColor(color.hex);
      ctx.font = "42px Satoshi";
      ctx.textAlign = "center";

      const textX = index * rectWidth + rectWidth / 2;
      const hexTextY = canvas.height - 100;
      const nameTextY = canvas.height - 70;

      if (showText) {
        ctx.fillText(`#${color.hex.toUpperCase()}`, textX, hexTextY);
      }

      if (showColorName) {
        ctx.font = "32px Satoshi";
        ctx.fillText(color.name, textX, nameTextY);
      }
    }
  });

  return canvas.toDataURL();
}

function getContrastColor(hex) {
  // Function to get contrast color (black or white) based on the given hex color
  const rgb = parseInt(hex, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 186 ? "#000000" : "#FFFFFF";
}

export default App;
