Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\SUPORTE\.gemini\antigravity-ide\brain\80fa4c46-9424-44a7-82ee-9ec58253e1d5\.user_uploaded\media_1792949358605.jpg'
$root = 'C:\C#\Casa organizada'

function Resize-Image($sourceImage, $width, $height, $targetPath) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $g.DrawImage($sourceImage, $rect)
    
    $targetDir = [System.IO.Path]::GetDirectoryName($targetPath)
    if (!(Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    
    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Salvo: $targetPath ($($width)x$($height))"
}

$srcImage = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Logo original: $($srcImage.Width)x$($srcImage.Height)"

# 1. Imagens Web / PWA
Resize-Image $srcImage 512 512 "$root\public\logo.png"
Resize-Image $srcImage 192 192 "$root\public\logo-192.png"
Resize-Image $srcImage 64 64 "$root\public\favicon.png"

# 2. Ícones Android Mipmaps
$androidRes = "$root\android\app\src\main\res"

$sizes = @{
    'mipmap-mdpi' = 48
    'mipmap-hdpi' = 72
    'mipmap-xhdpi' = 96
    'mipmap-xxhdpi' = 144
    'mipmap-xxxhdpi' = 192
}

foreach ($folder in $sizes.Keys) {
    $dim = $sizes[$folder]
    $dir = "$androidRes\$folder"
    Resize-Image $srcImage $dim $dim "$dir\ic_launcher.png"
    Resize-Image $srcImage $dim $dim "$dir\ic_launcher_round.png"
    Resize-Image $srcImage $dim $dim "$dir\ic_launcher_foreground.png"
}

$srcImage.Dispose()
Write-Host "Todas as logos e icones foram gerados com sucesso!"
