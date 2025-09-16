import { useState, useRef, useEffect } from 'react'
import './PaintApp.css';

function PaintApp() {
  const canvasRef = useRef();
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [tool, setTool] = useState('pencil');
  const [lineWidth, setLineWidth] = useState(3);
  const defaultColors = ['#000000',
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#FFFF00',
    '#FF00FF',
    '#00FFFF',
    '#FFFFFF',
    '#808080',
    '#FFA500',
    '#800080',];

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 90 / 100;
    canvas.height = window.innerHeight * 0.8;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
      ctxRef.current.lineWidth = tool === 'eraser' ? 30 : lineWidth;
      ctxRef.current.lineWidth = lineWidth;
    }
  }, [color, tool, lineWidth]);

  const startDrawing = (e) => {
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) {
      return;
    }
    ctxRef.current.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctxRef.current.stroke();
  }

  const finishDrawing = () => {
    ctxRef.current.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <>
      <div className='paint-container'>
        <div className="color-platter">
          {defaultColors.map((c, index) => (
            <button
              key={index}
              className={`color-btn ${color === c && tool === 'pencil' ? "active" : ""}`}
              style={{ backgroundColor: c }}
              onClick={() => {
                setColor(c);
                setTool('pencil');
              }}
            />
          ))}

          <input
            className="color-picker"
            type="color"
            value={tool === "eraser" ? "#FFFFFF" : color}
            onChange={(e) => {
              setColor(e.target.value);
              setTool("pencil");
            }}
          />
          <br />
        </div>

        <div className='tools'>

          <label className="line-label">
            Line Width:
            <input
              type="range"
              min="1"
              max="50"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
            />
            <span>{lineWidth}px</span>
          </label>

          <button
            className={`tool-btn ${tool === "pencil" ? "active" : ""}`}
            onClick={() => setTool("pencil")}
          >
            <img src="/assets/pen-svgrepo-com.svg" alt="pencil" />
          </button>

          <button
            className={`tool-btn ${tool === "eraser" ? "active" : ""}`}
            onClick={() => setTool("eraser")}
          >
            <img src="/assets/eraser-svgrepo-com.svg" alt="eraser" />
          </button>

          <button
            className={`tool-btn ${tool === "delete" ? "active" : ""}`}
            onClick={clearCanvas}
          >
            <img src="/assets/delete-1487-svgrepo-com.svg" alt="delete canvas" />
          </button>

        </div>
        <canvas
          className='paint-canvas'
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={finishDrawing}
          onMouseLeave={finishDrawing}
        />
      </div>
    </>
  )
}

export default PaintApp
