
#cidade3d {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  background: linear-gradient(#c6e2f7, #dff0dc);
  color: #513c63;
  font-family: system-ui, sans-serif;
  overflow: hidden;
}

#cidade3d[hidden] {
  display: none;
}

#cidade3d #c3canvas {
  position: absolute;
  inset: 0;
}

#cidade3d canvas {
  display: block;
  width: 100%;
  height: 100%;
  outline: none;
}

#cidade3d .c3-top {
  position: absolute;
  z-index: 3;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

#cidade3d .c3-top > * {
  pointer-events: auto;
}

#cidade3d .c3-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 15px;
  border-radius: 17px;
  background: #fffaf0ef;
  border: 1px solid #fff;
  box-shadow: 0 5px 20px #536b6430;
  backdrop-filter: blur(10px);
  font-weight: 850;
}

#cidade3d #c3count {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.72;
}

#cidade3d .c3-actions {
  display: flex;
  gap: 7px;
}

#cidade3d button {
  border: 1px solid #fff;
  border-radius: 14px;
  padding: 10px 14px;
  background: #fffaf0;
  color: #513c63;
  font-weight: 750;
  cursor: pointer;
  box-shadow: 0 3px 12px #44305a22;
}

#cidade3d button:hover {
  background: #f8e4f0;
}

#cidade3d .c3-help {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100vw - 32px);
  box-sizing: border-box;
  padding: 10px 14px;
  border-radius: 14px;
  background: #fffaf0ef;
  box-shadow: 0 4px 18px #536b6430;
  font-size: 12px;
  text-align: center;
}

#cidade3d #c3info {
  position: absolute;
  z-index: 4;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  min-width: 190px;
  max-width: min(340px, calc(100vw - 40px));
  padding: 17px 42px 17px 18px;
  border: 1px solid #fff;
  border-radius: 18px;
  background: #fffaf0f2;
  box-shadow: 0 10px 35px #3d4b5935;
  backdrop-filter: blur(12px);
}

#cidade3d #c3info[hidden] {
  display: none;
}

#cidade3d #c3info strong,
#cidade3d #c3info span {
  display: block;
}

#cidade3d #c3info strong {
  font-size: 17px;
  margin-bottom: 5px;
}

#cidade3d #c3info span {
  font-size: 12px;
  opacity: 0.75;
  text-transform: capitalize;
}

#cidade3d #c3infoclose {
  position: absolute;
  right: 8px;
  top: 8px;
  padding: 5px 8px;
  box-shadow: none;
}

@media (max-width: 540px) {
  #cidade3d .c3-top {
    align-items: flex-start;
  }

  #cidade3d .c3-title {
    font-size: 14px;
  }

  #cidade3d .c3-actions {
    flex-direction: column;
  }

  #cidade3d .c3-help {
    bottom: 10px;
    font-size: 11px;
  }
}
