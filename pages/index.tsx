import { useState } from 'react'
import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import CSVReader from 'react-csv-reader'
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

//Komplett = (mass * ((v1 - v0) / time) + (0.5p * (v * v) * Cd * A)) * radius / final gear ratio

const Home: NextPage = () => {

  interface table {
    rpm : number[],
    torque : number[],
    horsepower : number[]
  }

  interface config {
    mass : number,
    gearRatio : number,
    finalDrive : number,
    finalGearRatio : number,
    airDensity : number,
    wheelRadius : number,
    frontalArea : number,
    dragCoefficient : number,
    smoothing : number,
  }

  let done = false;
  const [dyno, setDyno] = useState<table>({
    rpm : [],
    torque : [],
    horsepower : []
  });

  const [config, setConfig] = useState({
    mass : 1391,
    gearRatio : 1.308,
    finalDrive : 3.692,
    finalGearRatio : 0,
    airDensity : 1.269,
    wheelRadius : 0.302,
    frontalArea : 1.82,
    dragCoefficient : 0.34,
    smoothing : 10,
  });

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

    if(torque > 0) {
      dyno.torque.push(torque);
      dyno.rpm.push(current.rpm);
      dyno.horsepower.push(horsepower);
    }
  }

  function populate(data: any[]) {
    console.log(data);
    for (let i = 0; i < data.length; i += config.smoothing) {
      if(!done) {
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

        calc(prev, current, next);
      }
      else break;
    }

    setDyno({
      torque : dyno.torque,
      rpm : dyno.rpm,
      horsepower : dyno.horsepower
    });
    
  }

  const papaparseOptions = {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.toLowerCase().replace(/\W/g, "_")
  };

  const chartConfig = {
    options: {
      chart: {
        id: "basic-bar"
      },
      xaxis: {
        categories: dyno.rpm
      }
    },
    series: [
      {
        name: "Torque",
        data: dyno.torque
      },
      {
        name: "Horsepower",
        data: dyno.horsepower
      }
    ]
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Virtual Dyno</title>
      </Head>
      {dyno.torque.length > 0 &&
        <Chart
          options={chartConfig.options}
          series={chartConfig.series}
          type="line"
          width="1000"
        />
      }
      <CSVReader 
        onFileLoaded={(data) => populate(data)}
        parserOptions={papaparseOptions}
        />
      
    </div>
  )
}

export default Home
