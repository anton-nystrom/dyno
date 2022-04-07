import { useState } from 'react'
import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import CSVReader from 'react-csv-reader'

//Komplett = (mass * ((v1 - v0) / time) + (0.5p * (v * v) * Cd * A)) * radius / final gear ratio

const Home: NextPage = () => {

  const [data, setData] = useState<any[]>([]);
  const graph: object[] = [];

  let config = {
    mass : 1391,
    gearRatio : 1.308,
    finalDrive : 3.692,
    finalGearRatio : 0,
    airDensity : 1.269,
    wheelRadius : 0.302,
    frontalArea : 1.82,
    dragCoefficient : 0.34
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
    
    return {
      rpm : current.rpm,
      torque : torque,
      horsepower : horsepower
    };
  }

  const table = {
    prev : {
      rpm : 3936,
      time : 28.213
    },
    current : {
      rpm : 4045,
      time : 28.494
    },
    next : {
      rpm : 4141,
      time : 28.730
    }
  };

  if(data.length > 0) {
    console.log(data);
    for (let i = 0; i < data.length; i++) {
      let prev = data[i - 1];
      let current = data[i];
      let next = data[i + 1];
      
      if(i === 0) {
        prev = current;
      }
      else if(i === data.length - 1) {
        next = current;
      }

      graph.push(calc(prev, current, next));

    }
    console.log(graph);
    
  }

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
      <CSVReader 
        onFileLoaded={(data) => setData(data)}
        parserOptions={papaparseOptions}
        />
    </div>
  )
}

export default Home
