"use client";

// Registro central do Chart.js pro Bank — importar gráficos SEMPRE daqui
// pra registrar os controllers/escalas uma vez só (mesmo padrão do FM).
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Legend,
  Tooltip,
} from "chart.js";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Legend,
  Tooltip,
);

export { Doughnut, Bar, Line } from "react-chartjs-2";
export { ChartJS };
