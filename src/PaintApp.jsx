import { useState, useRef, useEffect } from 'react'
import { LuCircle, LuDownload, LuEraser, LuMinus, LuPalette, LuRedo2, LuSquare, LuTrash2, LuType, LuUndo2, LuPenLine } from 'react-icons/lu';
import './PaintApp.css';

function PaintApp() {
  const canvasRef = useRef();
  const ctxRef = useRef(null);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const startPointRef = useRef(null);
  const currentPointRef = useRef(null);
  const previewSnapshotRef = useRef(null);
  const textBoxElementsRef = useRef(new Map());
  const textDragRef = useRef(null);
  const nextTextBoxIdRef = useRef(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [tool, setTool] = useState('pencil');
  const [lineWidth, setLineWidth] = useState(3);
  const [textBoxes, setTextBoxes] = useState([]);
  const [activeTextBoxId, setActiveTextBoxId] = useState(null);
  const defaultColors = ['#111827', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#f8fafc'];
  const isShapeTool = ['line', 'rectangle', 'circle'].includes(tool);

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const setTextBoxElementRef = (id) => (element) => {
    if (element) {
      textBoxElementsRef.current.set(id, element);
    } else {
      textBoxElementsRef.current.delete(id);
    }
  };

  const addTextBox = () => {
    const canvas = canvasRef.current;
    const frameRect = canvas?.parentElement?.getBoundingClientRect();
    const id = nextTextBoxIdRef.current;
    nextTextBoxIdRef.current += 1;
    const width = 240;
    const height = 140;
    const offset = (id - 1) * 22;
    const fontSize = Math.max(18, Math.min(42, Math.round(lineWidth * 5)));

    setTextBoxes((current) => [
      ...current,
      {
        id,
        x: clamp(40 + offset, 0, Math.max(0, (frameRect?.width ?? 800) - width - 16)),
        y: clamp(40 + offset, 0, Math.max(0, (frameRect?.height ?? 500) - height - 16)),
        width,
        height,
        text: '',
        color,
        fontSize,
      },
    ]);
    setActiveTextBoxId(id);
    setTool('text');
  };

  const updateTextBox = (id, updater) => {
    setTextBoxes((current) => current.map((box) => (box.id === id ? updater(box) : box)));
  };

  const deleteTextBox = (id) => {
    setTextBoxes((current) => {
      const remaining = current.filter((box) => box.id !== id);
      setActiveTextBoxId((active) => (active === id ? remaining[0]?.id ?? null : active));
      return remaining;
    });
  };

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const fillCanvas = (fillStyle = '#fffdf8') => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (!canvas || !ctx) {
      return;
    }

    ctx.save();
    ctx.fillStyle = fillStyle;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  const storeSnapshot = () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    historyRef.current = [...historyRef.current, canvas.toDataURL('image/png')].slice(-20);
    redoRef.current = [];
  };

  const drawShape = (shape, startPoint, endPoint, preview = false) => {
    const ctx = ctxRef.current;

    if (!ctx || !startPoint || !endPoint) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = tool === 'eraser' ? 24 : lineWidth;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.beginPath();

    if (shape === 'line') {
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.stroke();
    } else if (shape === 'rectangle') {
      const width = endPoint.x - startPoint.x;
      const height = endPoint.y - startPoint.y;
      ctx.strokeRect(startPoint.x, startPoint.y, width, height);
    } else if (shape === 'circle') {
      const radius = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
      ctx.arc(startPoint.x, startPoint.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (!preview) {
      ctx.closePath();
    }

    ctx.restore();
  };

  const wrapText = (ctx, text, maxWidth) => {
    const words = text.trim().split(/\s+/);
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;

      if (ctx.measureText(nextLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = nextLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  const drawTextBox = (context, box) => {
    if (!context || !box || !box.text.trim()) {
      return;
    }

    const fontSize = box.fontSize ?? Math.max(18, Math.min(42, Math.round(box.height / 4)));
    const padding = 16;

    context.save();
    context.fillStyle = box.color ?? '#111827';
    context.globalCompositeOperation = 'source-over';
    context.font = `${fontSize}px Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    context.textBaseline = 'top';
    context.textAlign = 'left';

    const maxTextWidth = Math.max(20, box.width - padding * 2);
    const lines = wrapText(context, box.text, maxTextWidth);
    const lineHeight = fontSize * 1.22;
    const totalTextHeight = lines.length * lineHeight;
    let currentY = box.y + Math.max(padding, (box.height - totalTextHeight) / 2);

    lines.forEach((line) => {
      context.fillText(line, box.x + padding, currentY);
      currentY += lineHeight;
    });

    context.restore();
  };

  const restoreSnapshot = (snapshot) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (!canvas || !ctx || !snapshot) {
      return;
    }

    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = snapshot;
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (!canvas || !ctx) {
      return;
    }

    const { clientWidth, clientHeight } = canvas.parentElement;
    const latestSnapshot = historyRef.current[historyRef.current.length - 1];

    canvas.width = clientWidth;
    canvas.height = clientHeight;

    fillCanvas();
    if (latestSnapshot) {
      restoreSnapshot(latestSnapshot);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctxRef.current = ctx;

    resizeCanvas();

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    if (historyRef.current.length === 0) {
      historyRef.current = [canvas.toDataURL('image/png')];
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = color;
      ctxRef.current.lineWidth = tool === 'eraser' ? 24 : lineWidth;
      ctxRef.current.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    }
  }, [color, tool, lineWidth]);

  const startDrawing = (e) => {
    if (tool === 'text') {
      return;
    }

    const { x, y } = getPoint(e.nativeEvent);

    previewSnapshotRef.current = ctxRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    startPointRef.current = { x, y };
    currentPointRef.current = { x, y };

    if (!isShapeTool) {
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(x, y);
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) {
      return;
    }

    const { x, y } = getPoint(e.nativeEvent);
    currentPointRef.current = { x, y };

    if (isShapeTool) {
      ctxRef.current.putImageData(previewSnapshotRef.current, 0, 0);
      drawShape(tool, startPointRef.current, { x, y }, true);
      return;
    }

    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  }

  const finishDrawing = () => {
    if (tool === 'text') {
      return;
    }

    if (isDrawing) {
      if (isShapeTool && startPointRef.current) {
        ctxRef.current.putImageData(previewSnapshotRef.current, 0, 0);
        drawShape(tool, startPointRef.current, currentPointRef.current || startPointRef.current, false);
        storeSnapshot();
      } else {
        storeSnapshot();
      }
    }

    ctxRef.current.closePath();
    startPointRef.current = null;
    currentPointRef.current = null;
    previewSnapshotRef.current = null;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    fillCanvas();
    storeSnapshot();
    setTextBoxes([]);
    setActiveTextBoxId(null);
  };

  const undo = () => {
    if (historyRef.current.length <= 1) {
      return;
    }

    const currentState = historyRef.current.pop();
    redoRef.current = [currentState, ...redoRef.current];

    restoreSnapshot(historyRef.current[historyRef.current.length - 1]);
  };

  const redo = () => {
    if (redoRef.current.length === 0) {
      return;
    }

    const nextState = redoRef.current.shift();
    historyRef.current = [...historyRef.current, nextState].slice(-20);
    restoreSnapshot(nextState);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportContext = exportCanvas.getContext('2d');

    exportContext.drawImage(canvas, 0, 0);
    textBoxes.forEach((box) => drawTextBox(exportContext, box));

    const link = document.createElement('a');

    link.download = 'paint-studio.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const handleDeleteTextBox = (id, event) => {
    event.stopPropagation();
    event.preventDefault();
    deleteTextBox(id);
  };

  const startTextDrag = (id, e) => {
    e.preventDefault();

    const boxElement = textBoxElementsRef.current.get(id);

    if (!boxElement) {
      return;
    }

    const frameRect = canvasRef.current.parentElement.getBoundingClientRect();
    const boxRect = boxElement.getBoundingClientRect();

    textDragRef.current = {
      id,
      offsetX: e.clientX - boxRect.left,
      offsetY: e.clientY - boxRect.top,
      frameRect,
    };

    setActiveTextBoxId(id);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveTextDrag = (e) => {
    if (!textDragRef.current) {
      return;
    }

    const { id, offsetX, offsetY } = textDragRef.current;
    const boxElement = textBoxElementsRef.current.get(id);

    if (!boxElement) {
      return;
    }

    const frameRect = canvasRef.current.parentElement.getBoundingClientRect();
    const boxRect = boxElement.getBoundingClientRect();
    const nextX = clamp(e.clientX - frameRect.left - offsetX, 0, Math.max(0, frameRect.width - boxRect.width));
    const nextY = clamp(e.clientY - frameRect.top - offsetY, 0, Math.max(0, frameRect.height - boxRect.height));

    updateTextBox(id, (current) => ({
      ...current,
      x: nextX,
      y: nextY,
    }));
  };

  const endTextDrag = () => {
    textDragRef.current = null;
  };

  useEffect(() => {
    const elements = [...textBoxElementsRef.current.values()];

    if (elements.length === 0) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => {
      const frameRect = canvasRef.current.parentElement.getBoundingClientRect();

      setTextBoxes((current) => current.map((box) => {
        const element = textBoxElementsRef.current.get(box.id);

        if (!element) {
          return box;
        }

        const nextWidth = Math.round(element.getBoundingClientRect().width);
        const nextHeight = Math.round(element.getBoundingClientRect().height);

        if (box.width === nextWidth && box.height === nextHeight) {
          return box;
        }

        return {
          ...box,
          width: nextWidth,
          height: nextHeight,
          x: clamp(box.x, 0, Math.max(0, frameRect.width - nextWidth)),
          y: clamp(box.y, 0, Math.max(0, frameRect.height - nextHeight)),
        };
      }));
    });

    elements.forEach((element) => resizeObserver.observe(element));

    return () => resizeObserver.disconnect();
  }, [textBoxes]);

  return (
    <>
      <div className='paint-page'>
        <section className='paint-shell'>
          <div className='hero-copy'>
            <h1>Paint Studio</h1>
          </div>

          <div className='workspace'>
            <aside className='controls-panel'>
              <div className='panel-section'>
                <div className='section-heading'>Palette</div>
                <div className='color-platter'>
                  <div className='palette-icon' aria-hidden='true'>
                    <LuPalette />
                  </div>
                  {defaultColors.map((c) => (
                    <button
                      key={c}
                      className={`color-btn ${color === c && tool === 'pencil' ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => {
                        setColor(c);
                        setTool('pencil');
                      }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}

                  <label className='color-picker-wrap' aria-label='Custom color picker'>
                    <input
                      className="color-picker"
                      type="color"
                      value={color}
                      onChange={(e) => {
                        setColor(e.target.value);
                        setTool('pencil');
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className='panel-section'>
                <div className='section-heading'>Brush size</div>
                <label className="line-label">
                  <span>Fine</span>
                  <input
                    type="range"
                    min="1"
                    max="48"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                  />
                  <span>Bold</span>
                </label>
                <div className='size-readout'>{lineWidth}px</div>
              </div>

              <div className='panel-section'>
                <div className='section-heading'>Tools</div>
                <div className='tool-grid'>
                  <button
                    className={`tool-btn ${tool === 'pencil' ? 'active' : ''}`}
                    onClick={() => setTool('pencil')}
                  >
                    <LuPenLine />
                    Brush
                  </button>

                  <button
                    className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                    onClick={() => setTool('eraser')}
                  >
                    <LuEraser />
                    Eraser
                  </button>

                  <button className={`tool-btn ghost ${tool === 'line' ? 'active' : ''}`} onClick={() => setTool('line')}>
                    <LuMinus />
                    Line
                  </button>

                  <button className={`tool-btn ghost ${tool === 'rectangle' ? 'active' : ''}`} onClick={() => setTool('rectangle')}>
                    <LuSquare />
                    Rectangle
                  </button>

                  <button className={`tool-btn ghost ${tool === 'circle' ? 'active' : ''}`} onClick={() => setTool('circle')}>
                    <LuCircle />
                    Circle
                  </button>

                  <button className={`tool-btn ghost ${tool === 'text' ? 'active' : ''}`} onClick={addTextBox}>
                    <LuType />
                    Text
                  </button>

                  <button className='tool-btn ghost' onClick={undo}>
                    <LuUndo2 />
                    Undo
                  </button>

                  <button className='tool-btn ghost' onClick={redo}>
                    <LuRedo2 />
                    Redo
                  </button>

                  <button className='tool-btn ghost' onClick={downloadCanvas}>
                    <LuDownload />
                    Save
                  </button>

                  <button className='tool-btn danger' onClick={clearCanvas}>
                    <LuTrash2 />
                    Clear
                  </button>
                </div>
              </div>

              <p className='help-text'>Tip: press and drag with a mouse, trackpad, or stylus. Undo restores the last stroke only.</p>
            </aside>

            <div className='canvas-panel'>
              <div className='canvas-frame'>
                <canvas
                  className={`paint-canvas ${tool === 'text' ? 'is-text' : ''}`}
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={finishDrawing}
                  onPointerLeave={finishDrawing}
                />
                {textBoxes.map((box) => (
                  <div
                    key={box.id}
                    ref={setTextBoxElementRef(box.id)}
                    className={`text-box ${box.id === activeTextBoxId ? 'is-active' : 'is-idle'}`}
                    style={{ left: `${box.x}px`, top: `${box.y}px`, width: `${box.width}px`, height: `${box.height}px`, zIndex: box.id === activeTextBoxId ? 3 : 2 }}
                    onPointerDown={() => setActiveTextBoxId(box.id)}
                  >
                    <div
                      className='text-box-handle'
                      onPointerDown={(e) => startTextDrag(box.id, e)}
                      onPointerMove={moveTextDrag}
                      onPointerUp={endTextDrag}
                      onPointerCancel={endTextDrag}
                    >
                      <span>Drag to move</span>
                      <button
                        type='button'
                        className='text-box-delete'
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleDeleteTextBox(box.id, e)}
                        aria-label='Delete text box'
                      >
                        <LuTrash2 />
                      </button>
                    </div>
                    <textarea
                      className='text-box-editor'
                      value={box.text}
                      onChange={(e) => updateTextBox(box.id, (current) => ({ ...current, text: e.target.value }))}
                      placeholder='Type your text here'
                      readOnly={tool !== 'text'}
                      tabIndex={tool === 'text' ? 0 : -1}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

export default PaintApp
