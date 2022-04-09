import { useState } from 'react'
import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import CSVReader from 'react-csv-reader'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

//Komplett = (mass * ((v1 - v0) / time) + (0.5p * (v * v) * Cd * A)) * radius / final gear ratio

const Home: NextPage = () => {

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );

  const [data, setData] = useState<any[]>([]);
  const [dyno, setDyno] = useState<any[]>([]);
  const graph: object[] = [];
  let torqueTable: number[] = [];
  let rpmTable1: number[] = [];
  const [rpmTable, setRpmTable] = useState<any[]>([]);

  let config = {
    mass : 1391,
    gearRatio : 1.308,
    finalDrive : 3.692,
    finalGearRatio : 0,
    airDensity : 1.269,
    wheelRadius : 0.302,
    frontalArea : 1.82,
    dragCoefficient : 0.34,
    smoothing : 4,
  };

  if(config.gearRatio && config.finalDrive) {
    config.finalGearRatio = config.gearRatio * config.finalDrive;
  }

  function velocity(rpm: number) {
    const v = (rpm / config.finalGearRatio * config.wheelRadius * 2 * Math.PI) / 60;
    return v;
  }

  function calc(prev: {rpm: number; time: number;}, current: {rpm: number; time: number;}, next: {rpm: number; time: number;}) {
    
    const v1 = velocity(next.rpm);
    const v0 = velocity(prev.rpm);
    const v = velocity(current.rpm);
    const time = next.time - prev.time;

    const torque = (config.mass * ((v1 - v0) / time) + (0.5 * config.airDensity * (v * v) * config.dragCoefficient * config.frontalArea)) * config.wheelRadius / config.finalGearRatio
    const horsepower = torque * current.rpm / 7127;

    torqueTable.push(torque);
    rpmTable1.push(current.rpm);
    
    return {
      rpm : current.rpm,
      time : current.time,
      torque : torque,
      horsepower : horsepower
    };
  }

  function populate(data: any[]) {
    console.log(data);
    for (let i = 0; i < data.length; i += config.smoothing) {
      let prev = data[i - config.smoothing];
      let current = data[i];
      let next = data[i + config.smoothing];
      
      if(i < config.smoothing) {
        prev = current;
      }
      else if(i >= data.length - config.smoothing - 1) {
        next = current;
      }
      else if (next.rpm < current.rpm) {
        next = current;
      }

      graph.push(calc(prev, current, next));

    }
    console.log(graph);
    setDyno(graph);
    setRpmTable(rpmTable1);
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Virtual Dyno',
      },
    },
  };

  const chartLabels = [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500];

  const chartData = {
    labels: rpmTable,
    datasets: [
      {
        label: 'Torque',
        data: torqueTable,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };


  const papaparseOptions = {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.toLowerCase().replace(/\W/g, "_")
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Virtual Dyno</title>
      </Head>
      {dyno.length > 0 &&
        <Line options={chartOptions} data={chartData} />
      }
      <CSVReader 
        onFileLoaded={(data) => populate(data)}
        parserOptions={papaparseOptions}
        />
      
    </div>
  )
}

export default Home
