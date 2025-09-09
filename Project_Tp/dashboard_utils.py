import psutil
import time
import platform
def get_cpu_info():
    """
    Retorna un diccionario con:
    - nombre de la CPU
    - porcentaje de uso actual
    """
    cpu_name = platform.processor()  # Nombre de la CPU
    usage = psutil.cpu_percent(interval=1)
    
    return {
        "name": cpu_name,
        "usage": usage
    }

def get_memory_usage():
    """Uso de RAM (usado / total en GB)."""
    mem = psutil.virtual_memory()
    return {
        "used": round(mem.used / (1024**3), 2),
        "total": round(mem.total / (1024**3), 2),
        "percent": mem.percent
    }

def get_disk_usage():
    """Uso de disco (usado / total en GB)."""
    disk = psutil.disk_usage('/')
    return {
        "used": round(disk.used / (1024**3), 2),
        "total": round(disk.total / (1024**3), 2),
        "percent": disk.percent
    }

def get_disk_active_percent(interval=1):
    """
    Estima el porcentaje de actividad del disco (lectura/escritura) en un intervalo dado.
    """
    io_start = psutil.disk_io_counters()
    read_start = io_start.read_bytes
    write_start = io_start.write_bytes

    time.sleep(interval)

    io_end = psutil.disk_io_counters()
    read_end = io_end.read_bytes
    write_end = io_end.write_bytes

    # Bytes totales procesados en el intervalo
    total_bytes = (read_end - read_start) + (write_end - write_start)

    # Consideramos un valor máximo arbitrario para 100% (puedes ajustarlo según tu disco)
    max_bytes_per_sec = 100 * 1024 * 1024  # 100 MB/s por ejemplo
    percent = min(100, (total_bytes / (max_bytes_per_sec * interval)) * 100)
    
    return round(percent, 2)

def get_connected_users():
    """Ejemplo: cantidad de usuarios conectados al chat (dummy de momento)."""
    # Aquí más adelante lo conectamos a la base de datos de usuarios
    return 5
