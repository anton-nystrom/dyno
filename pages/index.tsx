import { useState } from 'react'
import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import CSVReader from 'react-csv-reader'
import dynamic from 'next/dynamic';
import * as ReactDOMClient from 'react-dom/client'
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

//Komplett = (mass * ((v1 - v0) / time) + (0.5p * (v * v) * Cd * A)) * radius / final gear ratio

const Home: NextPage = () => {
  interface table {
    rpm : number[],
    torque : number[],
    horsepower : number[]
  }

  interface config {
    [key: string]: number;
  }

  let done = false;
  const [data, setData] = useState<any[]>([]);
  
  let dyno : table = {
    rpm : [],
    torque : [],
    horsepower : []
  };

  let config : config= {
    mass : 1391,
    gearRatio : 1.308,
    finalDrive : 3.692,
    finalGearRatio : 0,
    airDensity : 1.269,
    wheelRadius : 0.302,
    frontalArea : 1.82,
    dragCoefficient : 0.34,
    smoothing : 10,
  };

  const [chart, setChart] = useState({
    options: {
      chart: {
        id: "basic-bar"
      },
      xaxis: {
        categories: [-1]
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

  function populate(array: any[]) {
    setData(array)
    
    for (let i = 0; i < array.length; i += config.smoothing) {
      if(!done) {
        let prev = array[i - config.smoothing];
        let current = array[i];
        let next = array[i + config.smoothing];
        
        if(i < config.smoothing) {
          prev = current;
        }
        else if(i >= array.length - config.smoothing - 1) {
          next = current;
        }
        else if (next.rpm < current.rpm) {
          next = current;
        }

        calc(prev, current, next);
      }
      else break;
    }

    setChart({
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
    });
    
  }

  const papaparseOptions = {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.toLowerCase().replace(/\W/g, "_")
  };

  function updateConfig(id: string, value: number) {
    config[id] = value;
    
    if(data.length > 0) {
      populate(data);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Virtual Dyno</title>
      </Head>
      {Object.entries(config).map((item) => {
        const id = item[0];
        const value = item[1].toString();
        return(
          <label key={id}>
            {id}
            <input id={id} placeholder={value} onChange={(e) => parseInt(e.target.value) > 0 ? updateConfig(e.target.id, parseInt(e.target.value)) : null}/>
          </label>
        )
      })}
      {chart.options.xaxis.categories[0] !== -1 &&
        <Chart
          options={chart.options}
          series={chart.series}
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
